import View from '@ckeditor/ckeditor5-ui/src/view';


export default class CoverListItemView extends View {
	constructor( locale ) {
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
