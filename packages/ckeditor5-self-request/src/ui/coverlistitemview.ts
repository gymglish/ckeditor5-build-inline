import View from '@ckeditor/ckeditor5-ui/src/view';
import { Locale } from '@ckeditor/ckeditor5-utils';

export type CoverListItemViewOptions = {
	label: string;
	value: string;
	isOn?: boolean;
	isNew?: boolean;
};

export default class CoverListItemView extends View {
	public declare label: string;
	public declare value: string;
	public declare isOn: boolean;
	public declare isNew: boolean;

	constructor( locale: Locale ) {
		super( locale );

		const bind = this.bindTemplate;

		this.set( 'label', '' );
		this.set( 'value', '' );
		this.set( 'isOn', false );
		this.set( 'isNew', false );

		this.setTemplate( {
			tag: 'li',

			children: [
				{
					text: this.bindTemplate.to( 'label' )
				}
			],

			attributes: {
				class: [
					'ck',
					'ck-list__item',
					'ck-list__item-selfrequest',
					bind.to( 'isOn', value => value ? 'ck-on' : 'ck-off' ),
				],
			},

			on: {
				click: bind.to( evt => {
					this.fire( 'execute' );
				} )
			}
		} );
	}

	highlight() {
		this.isOn = true;
	}

	removeHighlight() {
		this.isOn = false;
	}

}
