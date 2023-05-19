/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module link/ui/linkactionsview
 */

import { ButtonView, View, ViewCollection, FocusCycler } from 'ckeditor5/src/ui';
import { FocusTracker, KeystrokeHandler, type LocaleTranslate, type Locale } from 'ckeditor5/src/utils';
import { Editor, icons } from 'ckeditor5/src/core';

import { ensureSafeUrl } from '../utils';

// See: #8833.
// eslint-disable-next-line ckeditor5-rules/ckeditor-imports
import '@ckeditor/ckeditor5-ui/theme/components/responsive-form/responsiveform.css';
import '../../theme/linkactions.css';

import unlinkIcon from '../../theme/icons/unlink.svg';
import { Subscription } from 'rxjs';
import { selfRequestFunc } from '../utils';

/**
 * The link actions view class. This view displays the link preview, allows
 * unlinking or editing the link.
 */
export default class LinkActionsView extends View {
	/**
	 * Tracks information about DOM focus in the actions.
	 */
	public readonly focusTracker = new FocusTracker();

	/**
	 * An instance of the {@link module:utils/keystrokehandler~KeystrokeHandler}.
	 */
	public readonly keystrokes = new KeystrokeHandler();

	/**
	 * The href preview view.
	 */
	public previewButtonView: View;

	/**
	 * The unlink button view.
	 */
	public unlinkButtonView: ButtonView;

	/**
	 * The edit link button view.
	 */
	public editButtonView: ButtonView;

	/**
	 * The value of the "href" attribute of the link to use in the {@link #previewButtonView}.
	 *
	 * @observable
	 */
	declare public href: string | undefined;

	/**
	 * A collection of views that can be focused in the view.
	 */
	private readonly _focusables = new ViewCollection();

	/**
	 * Helps cycling over {@link #_focusables} in the view.
	 */
	private readonly _focusCycler: FocusCycler;

	private readonly editor: Editor;

	private coverSub: Subscription;

	private covers: any[] = [];

	declare public t: LocaleTranslate;

	/**
	 * @inheritDoc
	 */
	constructor( editor: Editor ) {
		const locale = editor.locale;
		super( locale );

		const t = locale.t;

		this.editor = editor;

		this.coverSub = Subscription.EMPTY;

		this.previewButtonView = this._createPreviewButton();
		this.unlinkButtonView = this._createButton( t( 'Unlink self request' ), unlinkIcon, 'unselfrequest' );
		this.editButtonView = this._createButton( t( 'Edit self request' ), icons.pencil, 'edit' );

		this.set( 'href', undefined );

		this._focusCycler = new FocusCycler( {
			focusables: this._focusables,
			focusTracker: this.focusTracker,
			keystrokeHandler: this.keystrokes,
			actions: {
				// Navigate fields backwards using the Shift + Tab keystroke.
				focusPrevious: 'shift + tab',

				// Navigate fields forwards using the Tab key.
				focusNext: 'tab'
			}
		} );

		this.setTemplate( {
			tag: 'div',

			attributes: {
				class: [
					'ck',
					'ck-link-actions',
					'ck-responsive-form'
				],

				// https://github.com/ckeditor/ckeditor5-link/issues/90
				tabindex: '-1'
			},

			children: [
				this.previewButtonView,
				this.editButtonView,
				this.unlinkButtonView
			]
		} );
	}

	/**
	 * @inheritDoc
	 */
	public override render(): void {
		super.render();

		const childViews = [
			this.previewButtonView,
			this.editButtonView,
			this.unlinkButtonView
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
		if (this.coverSub) {
			this.coverSub.unsubscribe();
		}
		super.destroy();

		this.focusTracker.destroy();
		this.keystrokes.destroy();
	}

	/**
	 * Focuses the fist {@link #_focusables} in the actions.
	 */
	public focus(): void {
		this._focusCycler.focusFirst();
	}

	/**
	 * Creates a button view.
	 *
	 * @param label The button label.
	 * @param icon The button icon.
	 * @param eventName An event name that the `ButtonView#execute` event will be delegated to.
	 * @returns The button view instance.
	 */
	private _createButton( label: string, icon: string, eventName?: string ): ButtonView {
		const button = new ButtonView( this.locale );

		button.set( {
			label,
			icon,
			tooltip: true
		} );

		button.delegate( 'execute' ).to( this, eventName );

		return button;
	}

	/**
	 * Creates a link href preview button.
	 * @param href The href attribute of the link.
	 * @returns The button view instance.
	 * @private
	 * @returns {string}
	 * @memberof LinkActionsView
	 */
	private getUrl(href: string) {
		const matchingCover = this.covers.find(c => c.cover_name === href);
		const selfrequest: selfRequestFunc = this.editor.config.get('selfrequest') as selfRequestFunc;
		if (matchingCover) {
			return selfrequest.getCoverUrl(matchingCover);
		}
		return null;
	}

	/**
	 * Creates a link href preview button.
	 *
	 * @returns The button view instance.
	 */
	private _createPreviewButton(): ButtonView {

		const selfrequest: selfRequestFunc = this.editor.config.get('selfrequest') as selfRequestFunc;
		const obs = selfrequest.getCovers;
		if (obs) {
			this.coverSub = obs().subscribe((covers: any) => {
				this.covers = covers;
			});
		}
		const button = new ButtonView( this.locale );
		const bind = this.bindTemplate;
		const t = this.t;

		button.set( {
			withText: true,
			tooltip: t( 'Open grain in new tab' )
		} );

		button.extendTemplate( {
			attributes: {
				class: [
					'ck',
					'ck-link-actions__preview'
				],
				href: bind.to( 'href', href => href && this.getUrl( href ) ),
				target: '_blank',
				rel: 'noopener noreferrer'
			}
		} );

		button.bind( 'label' ).to( this, 'href', href => {
			return href || t( 'This grain does not exist.' );
		} );

		button.bind( 'isEnabled' ).to( this, 'href', href => !!href );

		button.template!.tag = 'a';
		button.template!.eventListeners = {};

		return button;
	}
}

/**
 * Fired when the {@link ~LinkActionsView#editButtonView} is clicked.
 *
 * @eventName ~LinkActionsView#edit
 */
export type EditEvent = {
	name: 'edit';
	args: [];
};

/**
 * Fired when the {@link ~LinkActionsView#unlinkButtonView} is clicked.
 *
 * @eventName ~LinkActionsView#unlink
 */
export type UnlinkEvent = {
	name: 'unselfrequest';
	args: [];
};
