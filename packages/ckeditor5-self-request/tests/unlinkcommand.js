/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
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

				model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );
				model.schema.extend( '$text', {
					allowIn: [ '$root', 'paragraph' ],
					allowAttributes: 'selfRequestHref'
				} );
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

		describe( 'for block images', () => {
			beforeEach( () => {
				model.schema.register( 'imageBlock', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );
			} );

			it( 'should be true when an image is selected', () => {
				setData( model, '[<imageBlock selfRequestHref="foo"></imageBlock>]' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be true when an image and a text are selected', () => {
				setData( model, '[<imageBlock selfRequestHref="foo"></imageBlock>Foo]' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be true when a text and an image are selected', () => {
				setData( model, '[Foo<imageBlock selfRequestHref="foo"></imageBlock>]' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be true when two images are selected', () => {
				setData( model, '[<imageBlock selfRequestHref="foo"></imageBlock><imageBlock selfRequestHref="foo"></imageBlock>]' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false when a fake image is selected', () => {
				model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

				setData( model, '[<fake></fake>]' );

				expect( command.isEnabled ).to.be.false;
			} );

			it( 'should be false if an image does not accept the `selfRequestHref` attribute in given context', () => {
				model.schema.addAttributeCheck( ( ctx, attributeName ) => {
					if ( ctx.endsWith( '$root imageBlock' ) && attributeName == 'selfRequestHref' ) {
						return false;
					}
				} );

				setData( model, '[<imageBlock></imageBlock>]' );

				expect( command.isEnabled ).to.be.false;
			} );
		} );

		describe( 'for inline images', () => {
			beforeEach( () => {
				model.schema.register( 'imageInline', {
					isObject: true,
					isInline: true,
					allowWhere: '$text',
					allowAttributes: [ 'selfRequestHref' ]
				} );
			} );

			it( 'should be true when a linked inline image is selected', () => {
				setData( model, '<paragraph>[<imageInline selfRequestHref="foo"></imageInline>]</paragraph>' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be true when a linked inline image and a text are selected', () => {
				setData( model, '<paragraph>[<imageInline selfRequestHref="foo"></imageInline>Foo]</paragraph>' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be true when a text and a linked inline image are selected', () => {
				setData( model, '<paragraph>[Foo<imageInline selfRequestHref="foo"></imageInline>]</paragraph>' );

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be true when two linked inline images are selected', () => {
				setData( model,
					'<paragraph>[<imageInline selfRequestHref="foo"></imageInline><imageInline selfRequestHref="foo"></imageInline>]</paragraph>'
				);

				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if an inline image does not accept the `selfRequestHref` attribute in given context', () => {
				model.schema.addAttributeCheck( ( ctx, attributeName ) => {
					if ( ctx.endsWith( 'paragraph imageInline' ) && attributeName == 'selfRequestHref' ) {
						return false;
					}
				} );

				setData( model, '<paragraph>[<imageInline></imageInline>]</paragraph>' );

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

			it( 'should remove `selfRequestHref` attribute from multiple blocks', () => {
				setData( model,
					'<paragraph><$text selfRequestHref="url">fo[oo</$text></paragraph>' +
					'<paragraph><$text selfRequestHref="url">123</$text></paragraph>' +
					'<paragraph><$text selfRequestHref="url">baa]ar</$text></paragraph>'
				);

				command.execute();

				expect( getData( model ) ).to.equal(
					'<paragraph><$text selfRequestHref="url">fo</$text>[oo</paragraph>' +
					'<paragraph>123</paragraph>' +
					'<paragraph>baa]<$text selfRequestHref="url">ar</$text></paragraph>'
				);
			} );

			it( 'should remove `selfRequestHref` attribute from selection', () => {
				setData( model, '<$text selfRequestHref="url">f[ooba]r</$text>' );

				command.execute();

				expect( document.selection.hasAttribute( 'selfRequestHref' ) ).to.false;
			} );

			describe( 'for block elements allowing selfRequestHref', () => {
				beforeEach( () => {
					model.schema.register( 'imageBlock', { isBlock: true, allowWhere: '$text', allowAttributes: [ 'selfRequestHref' ] } );
				} );

				it( 'should remove the selfRequestHref attribute when a linked block is selected', () => {
					setData( model, '[<imageBlock selfRequestHref="foo"></imageBlock>]' );

					command.execute();

					expect( getData( model ) ).to.equal( '[<imageBlock></imageBlock>]' );
				} );

				it( 'should remove the selfRequestHref attribute when a linked block and text are selected', () => {
					setData( model, '[<imageBlock selfRequestHref="foo"></imageBlock><paragraph>Foo]</paragraph>' );

					command.execute();

					expect( getData( model ) ).to.equal( '[<imageBlock></imageBlock><paragraph>Foo]</paragraph>' );
				} );

				it( 'should remove the selfRequestHref attribute when a text and a linked block are selected', () => {
					setData( model, '<paragraph>[Foo</paragraph><imageBlock selfRequestHref="foo"></imageBlock>]' );

					command.execute();

					expect( getData( model ) ).to.equal( '<paragraph>[Foo</paragraph><imageBlock></imageBlock>]' );
				} );

				it( 'should remove the selfRequestHref attribute when two linked blocks are selected', () => {
					setData( model, '[<imageBlock selfRequestHref="foo"></imageBlock><imageBlock selfRequestHref="bar"></imageBlock>]' );

					command.execute();

					expect( getData( model ) ).to.equal( '[<imageBlock></imageBlock><imageBlock></imageBlock>]' );
				} );
			} );

			describe( 'for inline elements allowing selfRequestHref', () => {
				beforeEach( () => {
					model.schema.register( 'imageInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
				} );

				it( 'should be true when a linked inline element is selected', () => {
					setData( model, '<paragraph>[<imageInline selfRequestHref="foo"></imageInline>]</paragraph>' );

					command.execute();

					expect( getData( model ) ).to.equal( '<paragraph>[<imageInline></imageInline>]</paragraph>' );
				} );

				it( 'should be true when a linked inline element and a text are selected', () => {
					setData( model, '<paragraph>[<imageInline selfRequestHref="foo"></imageInline>Foo]</paragraph>' );

					command.execute();

					expect( getData( model ) ).to.equal( '<paragraph>[<imageInline></imageInline>Foo]</paragraph>' );
				} );

				it( 'should be true when a text and a linked inline element are selected', () => {
					setData( model, '<paragraph>[Foo<imageInline selfRequestHref="foo"></imageInline>]</paragraph>' );

					command.execute();

					expect( getData( model ) ).to.equal( '<paragraph>[Foo<imageInline></imageInline>]</paragraph>' );
				} );

				it( 'should be true when two linked inline element are selected', () => {
					setData( model,
						'<paragraph>[<imageInline selfRequestHref="foo"></imageInline><imageInline selfRequestHref="foo"></imageInline>]</paragraph>'
					);

					command.execute();

					expect( getData( model ) ).to.equal(
						'<paragraph>[<imageInline></imageInline><imageInline></imageInline>]</paragraph>'
					);
				} );
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
					'<paragraph><$text selfRequestHref="url">bar</$text></paragraph>' +
					'<paragraph><$text selfRequestHref="url">fo[]o</$text></paragraph>' +
					'<paragraph><$text selfRequestHref="url">bar</$text></paragraph>'
				);

				command.execute();

				expect( getData( model ) ).to.equal(
					'<paragraph><$text selfRequestHref="url">bar</$text></paragraph>' +
					'<paragraph>fo[]o</paragraph>' +
					'<paragraph><$text selfRequestHref="url">bar</$text></paragraph>'
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

					model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );

					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );

					model.schema.register( 'linkableInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
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

		it( 'should remove manual decorators from linkable blocks together with selfRequestHref', () => {
			setData( model, '[<linkableBlock linkIsFoo="true" linkIsBar="true" selfRequestHref="url"></linkableBlock>]' );

			command.execute();

			expect( getData( model ) ).to.equal( '[<linkableBlock></linkableBlock>]' );
		} );

		it( 'should remove manual decorators from linkable inline elements together with selfRequestHref', () => {
			setData( model, '<paragraph>[<linkableInline linkIsFoo="true" linkIsBar="true" selfRequestHref="foo"></linkableInline>]</paragraph>' );

			command.execute();

			expect( getData( model ) ).to.equal( '<paragraph>[<linkableInline></linkableInline>]</paragraph>' );
		} );
	} );
} );
