/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';
import UnlinkCommand from '../src/unlinkcommand';
import LinkEditing from '../src/linkediting';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';

describe( 'UnlinkCommand', () => {
	let editor, model, document, command;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		return ModelTestEditor.create()
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				document = model.document;
				command = new UnlinkCommand( editor );

				model.schema.extend( '$text', {
					allowIn: '$root',
					allowAttributes: 'selfRequestHref'
				} );

				model.schema.register( 'p', { inheritAllFrom: '$block' } );
			} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	describe( 'isEnabled', () => {
		it( 'should be true when selection has `selfRequestHref` attribute', () => {
			model.change( writer => {
				writer.setSelectionAttribute( 'selfRequestHref', 'value' );
			} );

			expect( command.isEnabled ).to.true;
		} );

		it( 'should be false when selection doesn\'t have `selfRequestHref` attribute', () => {
			model.change( writer => {
				writer.removeSelectionAttribute( 'selfRequestHref' );
			} );

			expect( command.isEnabled ).to.false;
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

	describe( 'execute()', () => {
		describe( 'non-collapsed selection', () => {
			it( 'should remove `selfRequestHref` attribute from selected text', () => {
				setData( model, '<$text selfRequestHref="url">f[ooba]r</$text>' );

				command.execute();

				expect( getData( model ) ).to.equal( '<$text selfRequestHref="url">f</$text>[ooba]<$text selfRequestHref="url">r</$text>' );
			} );

			it( 'should remove `selfRequestHref` attribute from selected text and do not modified other attributes', () => {
				setData( model, '<$text bold="true" selfRequestHref="url">f[ooba]r</$text>' );

				command.execute();

				const assertAll = () => {
					expect( getData( model ) ).to.equal(
						'<$text bold="true" selfRequestHref="url">f</$text>' +
						'[<$text bold="true">ooba</$text>]' +
						'<$text bold="true" selfRequestHref="url">r</$text>'
					);
				};

				const assertEdge = () => {
					expect( getData( model ) ).to.equal(
						'<$text bold="true" selfRequestHref="url">f</$text>' +
						'[<$text bold="true">ooba]<$text selfRequestHref="url">r</$text></$text>'
					);
				};

				testUtils.checkAssertions( assertAll, assertEdge );
			} );

			it( 'should remove `selfRequestHref` attribute from selected text when attributes have different value', () => {
				setData( model, '[<$text selfRequestHref="url">foo</$text><$text selfRequestHref="other url">bar</$text>]' );

				command.execute();

				expect( getData( model ) ).to.equal( '[foobar]' );
			} );

			it( 'should remove `selfRequestHref` attribute from selection', () => {
				setData( model, '<$text selfRequestHref="url">f[ooba]r</$text>' );

				command.execute();

				expect( document.selection.hasAttribute( 'selfRequestHref' ) ).to.false;
			} );
		} );

		describe( 'collapsed selection', () => {
			it( 'should remove `selfRequestHref` attribute from selection siblings with the same attribute value', () => {
				setData( model, '<$text selfRequestHref="url">foo[]bar</$text>' );

				command.execute();

				expect( getData( model ) ).to.equal( 'foo[]bar' );
			} );

			it( 'should remove `selfRequestHref` attribute from selection siblings with the same attribute value and do not modify ' +
				'other attributes', () => {
				setData(
					model,
					'<$text selfRequestHref="other url">fo</$text>' +
					'<$text selfRequestHref="url">o[]b</$text>' +
					'<$text selfRequestHref="other url">ar</$text>'
				);

				command.execute();

				expect( getData( model ) ).to.equal(
					'<$text selfRequestHref="other url">fo</$text>' +
					'o[]b' +
					'<$text selfRequestHref="other url">ar</$text>'
				);
			} );

			it( 'should do nothing with nodes with the same `selfRequestHref` value when there is a node with different value `selfRequestHref` ' +
				'attribute between', () => {
				setData(
					model,
					'<$text selfRequestHref="same url">f</$text>' +
					'<$text selfRequestHref="other url">o</$text>' +
					'<$text selfRequestHref="same url">o[]b</$text>' +
					'<$text selfRequestHref="other url">a</$text>' +
					'<$text selfRequestHref="same url">r</$text>'
				);

				command.execute();

				expect( getData( model ) )
					.to.equal(
						'<$text selfRequestHref="same url">f</$text>' +
						'<$text selfRequestHref="other url">o</$text>' +
						'o[]b' +
						'<$text selfRequestHref="other url">a</$text>' +
						'<$text selfRequestHref="same url">r</$text>'
					);
			} );

			it( 'should remove `selfRequestHref` attribute from selection siblings with the same attribute value ' +
				'and do nothing with other attributes',
			() => {
				setData(
					model,
					'<$text selfRequestHref="url">f</$text>' +
					'<$text bold="true" selfRequestHref="url">o</$text>' +
					'<$text selfRequestHref="url">o[]b</$text>' +
					'<$text bold="true" selfRequestHref="url">a</$text>' +
					'<$text selfRequestHref="url">r</$text>'
				);

				command.execute();

				expect( getData( model ) ).to.equal(
					'f' +
					'<$text bold="true">o</$text>' +
					'o[]b' +
					'<$text bold="true">a</$text>' +
					'r'
				);
			} );

			it( 'should remove `selfRequestHref` attribute from selection siblings only in the same parent as selection parent', () => {
				setData(
					model,
					'<p><$text selfRequestHref="url">bar</$text></p>' +
					'<p><$text selfRequestHref="url">fo[]o</$text></p>' +
					'<p><$text selfRequestHref="url">bar</$text></p>'
				);

				command.execute();

				expect( getData( model ) ).to.equal(
					'<p><$text selfRequestHref="url">bar</$text></p>' +
					'<p>fo[]o</p>' +
					'<p><$text selfRequestHref="url">bar</$text></p>'
				);
			} );

			it( 'should remove `selfRequestHref` attribute from selection siblings when selection is at the end of link', () => {
				setData( model, '<$text selfRequestHref="url">foobar</$text>[]' );

				command.execute();

				expect( getData( model ) ).to.equal( 'foobar[]' );
			} );

			it( 'should remove `selfRequestHref` attribute from selection siblings when selection is at the beginning of link', () => {
				setData( model, '[]<$text selfRequestHref="url">foobar</$text>' );

				command.execute();

				expect( getData( model ) ).to.equal( '[]foobar' );
			} );

			it( 'should remove `selfRequestHref` attribute from selection siblings on the left side when selection is between two elements with ' +
				'different `selfRequestHref` attributes',
			() => {
				setData( model, '<$text selfRequestHref="url">foo</$text>[]<$text selfRequestHref="other url">bar</$text>' );

				command.execute();

				expect( getData( model ) ).to.equal( 'foo[]<$text selfRequestHref="other url">bar</$text>' );
			} );

			it( 'should remove `selfRequestHref` attribute from selection', () => {
				setData( model, '<$text selfRequestHref="url">foo[]bar</$text>' );

				command.execute();

				expect( document.selection.hasAttribute( 'selfRequestHref' ) ).to.false;
			} );
		} );
	} );

	describe( 'manual decorators', () => {
		beforeEach( () => {
			editor.destroy();
			return ModelTestEditor.create( {
				extraPlugins: [ LinkEditing ],
				link: {
					decorators: {
						isFoo: {
							mode: 'manual',
							label: 'Foo',
							attributes: {
								class: 'foo'
							}
						},
						isBar: {
							mode: 'manual',
							label: 'Bar',
							attributes: {
								target: '_blank'
							}
						}
					}
				}
			} )
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;
					document = model.document;
					command = new UnlinkCommand( editor );

					model.schema.extend( '$text', {
						allowIn: '$root',
						allowAttributes: [ 'selfRequestHref', 'linkIsFoo', 'linkIsBar' ]
					} );

					model.schema.register( 'p', { inheritAllFrom: '$block' } );
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'should remove manual decorators from links together with selfRequestHref', () => {
			setData( model, '<$text linkIsFoo="true" linkIsBar="true" selfRequestHref="url">f[]oobar</$text>' );

			command.execute();

			expect( getData( model ) ).to.equal( 'f[]oobar' );
		} );
	} );
} );
