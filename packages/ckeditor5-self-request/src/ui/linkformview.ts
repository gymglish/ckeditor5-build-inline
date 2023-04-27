/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module link/ui/linkformview
 */

import {
	ButtonView,
	FocusCycler,
	LabeledFieldView,
	SwitchButtonView,
	View,
	ViewCollection,
	createLabeledInputText,
	submitHandler,
	type InputTextView
} from 'ckeditor5/src/ui';
import {
	FocusTracker,
	KeystrokeHandler,
	Collection,
	type Locale,
} from 'ckeditor5/src/utils';

import { icons, type Editor } from 'ckeditor5/src/core';

import type LinkCommand from '../linkcommand';
import type ManualDecorator from '../utils/manualdecorator';

// See: #8833.
// eslint-disable-next-line ckeditor5-rules/ckeditor-imports
import '@ckeditor/ckeditor5-ui/theme/components/responsive-form/responsiveform.css';
import '../../theme/linkform.css';

import { debounce } from 'lodash-es';
import { keyCodes } from '@ckeditor/ckeditor5-utils/src/keyboard';

import CoverListView from './coverlistview';
import CoverListItemView, { CoverListItemViewOptions } from './coverlistitemview';

import { first } from 'rxjs/operators';
import { Observable } from 'rxjs';


const handledKeyCodes = [
	keyCodes.arrowup,
	keyCodes.arrowdown,
	keyCodes.enter,
	keyCodes.tab,
];


function isHandledKey( keyCode: any ) {
	return handledKeyCodes.includes( keyCode );
}

type selfRequestFunc = {
	createCover: (coverName: string) => Observable<any>,
	getCovers: () => Observable<any>,
	getCoverUrl: (cover: any) => string,
	getMatchingCovers: (term: string, covers: any) => any[],
};

/**
 * The link form view controller class.
 *
 * See {@link module:link/ui/linkformview~LinkFormView}.
 */
export default class LinkFormView extends View {
	/**
	 * Tracks information about DOM focus in the form.
	 */
	public readonly focusTracker = new FocusTracker();

	/**
	 * An instance of the {@link module:utils/keystrokehandler~KeystrokeHandler}.
	 */
	public readonly keystrokes = new KeystrokeHandler();

	/**
	 * The URL input view.
	 */
	public urlInputView: LabeledFieldView<InputTextView>;

	/**
	 * The Save button view.
	 */
	public saveButtonView: ButtonView;

	/**
	 * The Cancel button view.
	 */
	public cancelButtonView: ButtonView;

	/**
	 * A collection of {@link module:ui/button/switchbuttonview~SwitchButtonView},
	 * which corresponds to {@link module:link/linkcommand~LinkCommand#manualDecorators manual decorators}
	 * configured in the editor.
	 */
	private readonly _manualDecoratorSwitches: ViewCollection;

	/**
	 * A collection of child views in the form.
	 */
	public readonly children: ViewCollection;

	/**
	 * A collection of views that can be focused in the form.
	 */
	private readonly _focusables = new ViewCollection();

	/**
	 * Helps cycling over {@link #_focusables} in the form.
	 */
	private readonly _focusCycler: FocusCycler;

	private readonly _items: Collection<CoverListItemViewOptions>;

	private readonly editor: Editor;

	private readonly filterCoversDebounced: any;

	private readonly coverListView: CoverListView;

	/**
	 * Creates an instance of the {@link module:link/ui/linkformview~LinkFormView} class.
	 *
	 * Also see {@link #render}.
	 *
	 * @param locale The localization services instance.
	 * @param linkCommand Reference to {@link module:link/linkcommand~LinkCommand}.
	 */
	constructor( editor: Editor, linkCommand: LinkCommand ) {
		const locale = editor.locale;
		super( locale );

		this.editor = editor;

		const t = locale.t;

		this._items = new Collection();

		this.filterCoversDebounced = debounce(this.filterCovers, 100);
		this.coverListView = this._createCoverListView();

		this.urlInputView = this._createCoverInput();
		this.saveButtonView = this._createButton( t( 'Save' ), icons.check, 'ck-button-save' );
		this.saveButtonView.type = 'submit';
		this.cancelButtonView = this._createButton( t( 'Cancel' ), icons.cancel, 'ck-button-cancel', 'cancel' );
		this._manualDecoratorSwitches = this._createManualDecoratorSwitches( linkCommand );
		this.children = this._createFormChildren( linkCommand.manualDecorators );

		this._focusCycler = new FocusCycler( {
			focusables: this._focusables,
			focusTracker: this.focusTracker,
			keystrokeHandler: this.keystrokes,
			actions: {
				// Navigate form fields backwards using the Shift + Tab keystroke.
				focusPrevious: 'shift + tab',

				// Navigate form fields forwards using the Tab key.
				focusNext: 'tab'
			}
		} );

		const classList = [ 'ck', 'ck-link-form', 'ck-responsive-form' ];

		if ( linkCommand.manualDecorators.length ) {
			classList.push( 'ck-link-form_layout-vertical', 'ck-vertical-form' );
		}

		this.setTemplate( {
			tag: 'form',

			attributes: {
				class: classList,

				// https://github.com/ckeditor/ckeditor5-link/issues/90
				tabindex: '-1'
			},

			children: this.children
		} );
	}

	/**
	 * Obtains the state of the {@link module:ui/button/switchbuttonview~SwitchButtonView switch buttons} representing
	 * {@link module:link/linkcommand~LinkCommand#manualDecorators manual link decorators}
	 * in the {@link module:link/ui/linkformview~LinkFormView}.
	 *
	 * @returns Key-value pairs, where the key is the name of the decorator and the value is its state.
	 */
	public getDecoratorSwitchesState(): Record<string, boolean> {
		return Array
			.from( this._manualDecoratorSwitches as Iterable<SwitchButtonView & { name: string }> )
			.reduce( ( accumulator, switchButton ) => {
				accumulator[ switchButton.name ] = switchButton.isOn;
				return accumulator;
			}, {} as Record<string, boolean> );
	}

	/**
	 * @inheritDoc
	 */
	public override render(): void {
		super.render();

		submitHandler( {
			view: this
		} );

		const childViews = [
			this.urlInputView,
			...this._manualDecoratorSwitches,
			this.cancelButtonView
		];

		childViews.forEach( v => {
			// Register the view as focusable.
			this._focusables.add( v );

			// Register the view in the focus tracker.
			this.focusTracker.add( v.element! );
		} );

		// Start listening for the keystrokes coming from #element.
		this.keystrokes.listenTo( this.element! );
	}

	/**
	 * @inheritDoc
	 */
	public override destroy(): void {
		super.destroy();

		this.focusTracker.destroy();
		this.keystrokes.destroy();
	}

	/**
	 * Focuses the fist {@link #_focusables} in the form.
	 */
	public focus(): void {
		this._focusCycler.focusFirst();
	}

	/**
	 * Creates a labeled input view.
	 *
	 * @returns Labeled field view instance.
	 */
	private _createCoverInput(): LabeledFieldView<InputTextView> {
		const t = this.locale!.t;
		const labeledInput = new LabeledFieldView( this.locale, createLabeledInputText );

		labeledInput.label = t( 'Grain name' );

		const fieldView = labeledInput.fieldView;

		fieldView.placeholder = 'Type to search a grain';

		fieldView.extendTemplate( {
			on: {
				keydown: fieldView.bindTemplate.to( 'keydown' )
			}
		} );

		fieldView.on( 'keydown', (evt, data  ) => {
			if ( isHandledKey( data.keyCode )) {
				data.preventDefault();
				evt.stop(); // Required for Enter key overriding.

				if ( data.keyCode == keyCodes.arrowdown ) {
					this.coverListView.selectNext();
				}

				if ( data.keyCode == keyCodes.arrowup ) {
					this.coverListView.selectPrevious();
				}

				if ( data.keyCode == keyCodes.enter || data.keyCode == keyCodes.tab ) {
					this.coverListView.executeSelected();
				}
			}
		}, { priority: 'highest' } ); // Required to override the Enter key.

		fieldView.on( 'input', () => {
			this.filterCoversDebounced(this.editor, fieldView.element?.value)
		});

		return labeledInput;
	}

	/**
	 * Creates a button view.
	 *
	 * @param label The button label.
	 * @param icon The button icon.
	 * @param className The additional button CSS class name.
	 * @param eventName An event name that the `ButtonView#execute` event will be delegated to.
	 * @returns The button view instance.
	 */
	private _createButton( label: string, icon: string, className: string, eventName?: string ): ButtonView {
		const button = new ButtonView( this.locale );

		button.set( {
			label,
			icon,
			tooltip: true
		} );

		button.extendTemplate( {
			attributes: {
				class: className
			}
		} );

		if ( eventName ) {
			button.delegate( 'execute' ).to( this, eventName );
		}

		return button;
	}

	/**
	 * Populates {@link module:ui/viewcollection~ViewCollection} of {@link module:ui/button/switchbuttonview~SwitchButtonView}
	 * made based on {@link module:link/linkcommand~LinkCommand#manualDecorators}.
	 *
	 * @param linkCommand A reference to the link command.
	 * @returns ViewCollection of switch buttons.
	 */
	private _createManualDecoratorSwitches( linkCommand: LinkCommand ): ViewCollection {
		const switches = this.createCollection();

		for ( const manualDecorator of linkCommand.manualDecorators ) {
			const switchButton: SwitchButtonView & { name?: string } = new SwitchButtonView( this.locale );

			switchButton.set( {
				name: manualDecorator.id,
				label: manualDecorator.label,
				withText: true
			} );

			switchButton.bind( 'isOn' ).toMany( [ manualDecorator, linkCommand ], 'value', ( decoratorValue, commandValue ) => {
				return commandValue === undefined && decoratorValue === undefined ? !!manualDecorator.defaultValue : !!decoratorValue;
			} );

			switchButton.on( 'execute', () => {
				manualDecorator.set( 'value', !switchButton.isOn );
			} );

			switches.add( switchButton );
		}

		return switches;
	}

	_createCoverListView() {
		const coverListView = new CoverListView(this.locale as Locale);
		coverListView.items.bindTo( this._items ).using( (result: CoverListItemViewOptions) => {
			const resultView: any = new CoverListItemView(this.locale as Locale);
			resultView.label = result.label;
			resultView.value = result.value;
			resultView.isNew = result.isNew;
			resultView.delegate( 'execute' ).to( this, 'selected' );
			return resultView;
		} );
		return coverListView;
	}

	/**
	 * Populates the {@link #children} collection of the form.
	 *
	 * If {@link module:link/linkcommand~LinkCommand#manualDecorators manual decorators} are configured in the editor, it creates an
	 * additional `View` wrapping all {@link #_manualDecoratorSwitches} switch buttons corresponding
	 * to these decorators.
	 *
	 * @param manualDecorators A reference to
	 * the collection of manual decorators stored in the link command.
	 * @returns The children of link form view.
	 */
	private _createFormChildren( manualDecorators: Collection<ManualDecorator> ): ViewCollection {
		const children = this.createCollection();

		const coverView = new View();

		coverView.setTemplate( {
			tag: 'ul',
			children: [{
				tag: 'li',
				children: [ this.urlInputView, this.coverListView ],
				attributes: {
					class: [
						'ck',
						'ck-list__item'
					]
				}
			}],
			attributes: {
				class: [
					'ck',
					'ck-reset',
					'ck-list'
				]
			}
		} );
		children.add( coverView );

		if ( manualDecorators.length ) {
			const additionalButtonsView = new View();

			additionalButtonsView.setTemplate( {
				tag: 'ul',
				children: this._manualDecoratorSwitches.map( switchButton => ( {
					tag: 'li',
					children: [ switchButton ],
					attributes: {
						class: [
							'ck',
							'ck-list__item'
						]
					}
				} ) ),
				attributes: {
					class: [
						'ck',
						'ck-reset',
						'ck-list'
					]
				}
			} );
			children.add( additionalButtonsView );
		}

		children.add( this.cancelButtonView );

		return children;
	}


	/**
	 * Creates a {@link module:ui/viewcollection~ViewCollection} of {@link module:ui/button/buttonview~ButtonView}
	 * made based on {@link module:link/linkcommand~LinkCommand#decorators}.
	 **/
	filterCovers(editor: Editor, value: any) {
		this._items.clear();
		if (!value) {
			return;
		}
		const selfrequest: selfRequestFunc = editor.config.get('selfrequest') as selfRequestFunc;
		selfrequest.getCovers().pipe(first()).subscribe((covers: any[]) => {
			if (value) {
				covers = selfrequest.getMatchingCovers(value, covers);
			}
			if (value && ! covers.find(c => c.cover_name.toLowerCase() === value.toLowerCase().split(' ').filter((value: any) => value).join('-'))) {
				const valueToCoverName = value.toUpperCase().replace(' ', '-');
				this._items.add({label: `Create grain ${valueToCoverName}`, value: valueToCoverName, isNew: true});
			}

			if (covers.length > 30) {
				covers = covers.slice(0, 30);
			}

			covers.map(c => this._items.add({label: c.cover_name, value: c.cover_name}));
			if (this._items.length) {
				this.coverListView.selectFirst();
			}
		});
	}
}
