/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';
import LinkCommand from '../src/linkcommand';
import ManualDecorator from '../src/utils/manualdecorator';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

describe( 'LinkCommand', () => {
	let editor, model, command;

	beforeEach( () => {
		return ModelTestEditor.create()
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				command = new LinkCommand( editor );

				model.schema.extend( '$text', {
					allowIn: '$root',
					allowAttributes: [ 'selfRequestHref', 'bold' ]
				} );

				model.schema.register( 'p', { inheritAllFrom: '$block' } );
			} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	describe( 'isEnabled', () => {
		// This test doesn't tests every possible case.
		// refresh() uses `isAttributeAllowedInSelection` helper which is fully tested in his own test.

		beforeEach( () => {
			model.schema.register( 'x', { inheritAllFrom: '$block' } );

			model.schema.addAttributeCheck( ( ctx, attributeName ) => {
				if ( ctx.endsWith( 'x $text' ) && attributeName == 'selfRequestHref' ) {
					return false;
				}
			} );
		} );

		describe( 'when selection is collapsed', () => {
			it( 'should be true if characters with the attribute can be placed at caret position', () => {
				setData( model, '<p>f[]oo</p>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if characters with the attribute cannot be placed at caret position', () => {
				setData( model, '<x>fo[]o</x>' );
				expect( command.isEnabled ).to.be.false;
			} );
		} );

		describe( 'when selection is not collapsed', () => {
			it( 'should be true if there is at least one node in selection that can have the attribute', () => {
				setData( model, '<p>[foo]</p>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if there are no nodes in selection that can have the attribute', () => {
				setData( model, '<x>[foo]</x>' );
				expect( command.isEnabled ).to.be.false;
			} );

			describe( 'for images', () => {
				beforeEach( () => {
					model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );
				} );

				it( 'should be true when an image is selected', () => {
					setData( model, '[<image selfRequestHref="foo"></image>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when an image and a text are selected', () => {
					setData( model, '[<image selfRequestHref="foo"></image>Foo]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a text and an image are selected', () => {
					setData( model, '[Foo<image selfRequestHref="foo"></image>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when two images are selected', () => {
					setData( model, '[<image selfRequestHref="foo"></image><image selfRequestHref="foo"></image>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be false when a fake image is selected', () => {
					model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

					setData( model, '[<fake></fake>]' );

					expect( command.isEnabled ).to.be.false;
				} );

				it( 'should be false if an image does not accept the `selfRequestHref` attribute in given context', () => {
					model.schema.addAttributeCheck( ( ctx, attributeName ) => {
						if ( ctx.endsWith( '$root image' ) && attributeName == 'selfRequestHref' ) {
							return false;
						}
					} );

					setData( model, '[<image></image>]' );

					expect( command.isEnabled ).to.be.false;
				} );
			} );
		} );
	} );

	describe( 'value', () => {
		describe( 'collapsed selection', () => {
			it( 'should be equal attribute value when selection is placed inside element with `selfRequestHref` attribute', () => {
				setData( model, '<$text selfRequestHref="url">foo[]bar</$text>' );

				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should be undefined when selection is placed inside element without `selfRequestHref` attribute', () => {
				setData( model, '<$text bold="true">foo[]bar</$text>' );

				expect( command.value ).to.be.undefined;
			} );
		} );

		describe( 'non-collapsed selection', () => {
			it( 'should be equal attribute value when selection contains only elements with `selfRequestHref` attribute', () => {
				setData( model, 'fo[<$text selfRequestHref="url">ob</$text>]ar' );

				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should be undefined when selection contains not only elements with `selfRequestHref` attribute', () => {
				setData( model, 'f[o<$text selfRequestHref="url">ob</$text>]ar' );

				expect( command.value ).to.be.undefined;
			} );
		} );

		describe( 'for images', () => {
			beforeEach( () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );
			} );

			it( 'should read the value from a selected image', () => {
				setData( model, '[<image selfRequestHref="foo"></image>]' );

				expect( command.value ).to.be.equal( 'foo' );
			} );

			it( 'should read the value from a selected image and ignore a text node', () => {
				setData( model, '[<image selfRequestHref="foo"></image><p><$text selfRequestHref="bar">bar</$text>]</p>' );

				expect( command.value ).to.be.equal( 'foo' );
			} );

			it( 'should read the value from a selected text node and ignore an image', () => {
				setData( model, '<p>[<$text selfRequestHref="bar">bar</$text></p><image selfRequestHref="foo"></image>]' );

				expect( command.value ).to.be.equal( 'bar' );
			} );

			it( 'should be undefined when a fake image is selected', () => {
				model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

				setData( model, '[<fake></fake>]' );

				expect( command.value ).to.be.undefined;
			} );
		} );
	} );

	describe( 'execute()', () => {
		describe( 'non-collapsed selection', () => {
			it( 'should set `selfRequestHref` attribute to selected text', () => {
				setData( model, 'f[ooba]r' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f[<$text selfRequestHref="url">ooba</$text>]r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should set `selfRequestHref` attribute to selected text when text already has attributes', () => {
				setData( model, 'f[o<$text bold="true">oba]r</$text>' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( command.value ).to.equal( 'url' );
				expect( getData( model ) ).to.equal(
					'f[<$text selfRequestHref="url">o</$text>' +
					'<$text bold="true" selfRequestHref="url">oba</$text>]' +
					'<$text bold="true">r</$text>'
				);
			} );

			it( 'should overwrite existing `selfRequestHref` attribute when selected text wraps text with `selfRequestHref` attribute', () => {
				setData( model, 'f[o<$text selfRequestHref="other url">o</$text>ba]r' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f[<$text selfRequestHref="url">ooba</$text>]r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should split text and overwrite attribute value when selection is inside text with `selfRequestHref` attribute', () => {
				setData( model, 'f<$text selfRequestHref="other url">o[ob]a</$text>r' );

				expect( command.value ).to.equal( 'other url' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'f' +
					'<$text selfRequestHref="other url">o</$text>' +
					'[<$text selfRequestHref="url">ob</$text>]' +
					'<$text selfRequestHref="other url">a</$text>' +
					'r'
				);
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should overwrite `selfRequestHref` attribute of selected text only, ' +
				'when selection start inside text with `selfRequestHref` attribute',
			() => {
				setData( model, 'f<$text selfRequestHref="other url">o[o</$text>ba]r' );

				expect( command.value ).to.equal( 'other url' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f<$text selfRequestHref="other url">o</$text>[<$text selfRequestHref="url">oba</$text>]r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should overwrite `selfRequestHref` attribute of selected text only, when selection end inside text with `selfRequestHref` ' +
				'attribute', () => {
				setData( model, 'f[o<$text selfRequestHref="other url">ob]a</$text>r' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'f[<$text selfRequestHref="url">oob</$text>]<$text selfRequestHref="other url">a</$text>r' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should set `selfRequestHref` attribute to selected text when text is split by $block element', () => {
				setData( model, '<p>f[oo</p><p>ba]r</p>' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) )
					.to.equal( '<p>f[<$text selfRequestHref="url">oo</$text></p><p><$text selfRequestHref="url">ba</$text>]r</p>' );
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should set `selfRequestHref` attribute to allowed elements', () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );

				setData( model, '<p>f[oo<image></image>ba]r</p>' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<p>f[<$text selfRequestHref="url">oo</$text><image selfRequestHref="url"></image><$text selfRequestHref="url">ba</$text>]r</p>'
				);
				expect( command.value ).to.equal( 'url' );
			} );

			it( 'should set `selfRequestHref` attribute to nested allowed elements', () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );
				model.schema.register( 'blockQuote', { allowWhere: '$block', allowContentOf: '$root' } );

				setData( model, '<p>foo</p>[<blockQuote><image></image></blockQuote>]<p>bar</p>' );

				command.execute( 'url' );

				expect( getData( model ) )
					.to.equal( '<p>foo</p>[<blockQuote><image selfRequestHref="url"></image></blockQuote>]<p>bar</p>' );
			} );

			it( 'should set `selfRequestHref` attribute to allowed elements on multi-selection', () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );

				setData( model, '<p>[<image></image>][<image></image>]</p>' );

				command.execute( 'url' );

				expect( getData( model ) )
					.to.equal( '<p>[<image selfRequestHref="url"></image>][<image selfRequestHref="url"></image>]</p>' );
			} );

			it( 'should set `selfRequestHref` attribute to allowed elements and omit disallowed', () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text' } );
				model.schema.register( 'caption', { allowIn: 'image' } );
				model.schema.extend( '$text', { allowIn: 'caption' } );

				setData( model, '<p>f[oo<image><caption>xxx</caption></image>ba]r</p>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<p>' +
						'f[<$text selfRequestHref="url">oo</$text>' +
						'<image><caption><$text selfRequestHref="url">xxx</$text></caption></image>' +
						'<$text selfRequestHref="url">ba</$text>]r' +
					'</p>'
				);
			} );

			it( 'should set `selfRequestHref` attribute to allowed elements and omit their children even if they accept the attribute', () => {
				model.schema.register( 'image', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );
				model.schema.register( 'caption', { allowIn: 'image' } );
				model.schema.extend( '$text', { allowIn: 'caption' } );

				setData( model, '<p>f[oo<image><caption>xxx</caption></image>ba]r</p>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<p>' +
						'f[<$text selfRequestHref="url">oo</$text>' +
						'<image selfRequestHref="url"><caption>xxx</caption></image>' +
						'<$text selfRequestHref="url">ba</$text>]r' +
					'</p>'
				);
			} );
		} );

		describe( 'collapsed selection', () => {
			it( 'should insert text with `selfRequestHref` attribute, text data equal to href and put the selection after the new link', () => {
				setData( model, 'foo[]bar' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( 'foo<$text selfRequestHref="url">url</$text>[]bar' );
			} );

			it( 'should insert text with `selfRequestHref` attribute, and selection attributes', () => {
				setData( model, '<$text bold="true">foo[]bar</$text>', {
					selectionAttributes: { bold: true }
				} );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<$text bold="true">foo</$text><$text bold="true" selfRequestHref="url">url</$text><$text bold="true">[]bar</$text>'
				);
			} );

			it( 'should update `selfRequestHref` attribute (text with `selfRequestHref` attribute) and put the selection after the node', () => {
				setData( model, '<$text selfRequestHref="other url">foo[]bar</$text>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<$text selfRequestHref="url">foobar</$text>[]' );
			} );

			it( 'should not insert text with `selfRequestHref` attribute when is not allowed in parent', () => {
				model.schema.addAttributeCheck( ( ctx, attributeName ) => {
					if ( ctx.endsWith( 'p $text' ) && attributeName == 'selfRequestHref' ) {
						return false;
					}
				} );

				setData( model, '<p>foo[]bar</p>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<p>foo[]bar</p>' );
			} );

			it( 'should not insert text node if link is empty', () => {
				setData( model, '<p>foo[]bar</p>' );

				command.execute( '' );

				expect( getData( model ) ).to.equal( '<p>foo[]bar</p>' );
			} );
		} );
	} );

	describe( 'manual decorators', () => {
		beforeEach( () => {
			editor.destroy();
			return ModelTestEditor.create()
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;
					command = new LinkCommand( editor );

					command.manualDecorators.add( new ManualDecorator( {
						id: 'linkIsFoo',
						label: 'Foo',
						attributes: {
							class: 'Foo'
						}
					} ) );
					command.manualDecorators.add( new ManualDecorator( {
						id: 'linkIsBar',
						label: 'Bar',
						attributes: {
							target: '_blank'
						}
					} ) );
					command.manualDecorators.add( new ManualDecorator( {
						id: 'linkIsSth',
						label: 'Sth',
						attributes: {
							class: 'sth'
						},
						defaultValue: true
					} ) );

					model.schema.extend( '$text', {
						allowIn: '$root',
						allowAttributes: [ 'selfRequestHref', 'linkIsFoo', 'linkIsBar', 'linkIsSth' ]
					} );

					model.schema.register( 'p', { inheritAllFrom: '$block' } );
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		describe( 'collapsed selection', () => {
			it( 'should insert additional attributes to link when it is created', () => {
				setData( model, 'foo[]bar' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'foo<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">url</$text>[]bar' );
			} );

			it( 'should add additional attributes to link when link is modified', () => {
				setData( model, 'f<$text selfRequestHref="url">o[]oba</$text>r' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'f<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">ooba</$text>[]r' );
			} );

			it( 'should remove additional attributes to link if those are falsy', () => {
				setData( model, 'foo<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true">u[]rl</$text>bar' );

				command.execute( 'url', { linkIsFoo: false, linkIsBar: false } );

				expect( getData( model ) ).to.equal( 'foo<$text selfRequestHref="url">url</$text>[]bar' );
			} );
		} );

		describe( 'range selection', () => {
			it( 'should insert additional attributes to link when it is created', () => {
				setData( model, 'f[ooba]r' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'f[<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">ooba</$text>]r' );
			} );

			it( 'should add additional attributes to link when link is modified', () => {
				setData( model, 'f[<$text selfRequestHref="foo">ooba</$text>]r' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( 'f[<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">ooba</$text>]r' );
			} );

			it( 'should remove additional attributes to link if those are falsy', () => {
				setData( model, 'foo[<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true">url</$text>]bar' );

				command.execute( 'url', { linkIsFoo: false, linkIsBar: false } );

				expect( getData( model ) ).to.equal( 'foo[<$text selfRequestHref="url">url</$text>]bar' );
			} );
		} );

		describe( 'restoreManualDecoratorStates()', () => {
			it( 'synchronize values with current model state', () => {
				setData( model, 'foo<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true">u[]rl</$text>bar' );

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: true
				} );

				command.manualDecorators.first.value = false;

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: false,
					linkIsBar: true,
					linkIsSth: true
				} );

				command.restoreManualDecoratorStates();

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: true
				} );
			} );

			it( 'synchronize values with current model state when the decorator that is "on" default is "off"', () => {
				setData( model, 'foo<$text selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="false">u[]rl</$text>bar' );

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: false
				} );

				command.manualDecorators.last.value = true;

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: true
				} );

				command.restoreManualDecoratorStates();

				expect( decoratorStates( command.manualDecorators ) ).to.deep.equal( {
					linkIsFoo: true,
					linkIsBar: true,
					linkIsSth: false
				} );
			} );
		} );

		describe( '_getDecoratorStateFromModel', () => {
			it( 'obtain current values from the model', () => {
				setData( model, 'foo[<$text selfRequestHref="url" linkIsBar="true">url</$text>]bar' );

				expect( command._getDecoratorStateFromModel( 'linkIsFoo' ) ).to.be.undefined;
				expect( command._getDecoratorStateFromModel( 'linkIsBar' ) ).to.be.true;
			} );
		} );
	} );
} );

function decoratorStates( manualDecorators ) {
	return Array.from( manualDecorators ).reduce( ( accumulator, currentValue ) => {
		accumulator[ currentValue.id ] = currentValue.value;
		return accumulator;
	}, {} );
}
