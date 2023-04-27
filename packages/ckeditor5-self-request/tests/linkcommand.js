/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';
import LinkCommand from '../src/linkcommand';
import ManualDecorator from '../src/utils/manualdecorator';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import AutomaticDecorators from '../src/utils/automaticdecorators';

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

				model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );
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
				setData( model, '<paragraph>f[]oo</paragraph>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if characters with the attribute cannot be placed at caret position', () => {
				setData( model, '<x>fo[]o</x>' );
				expect( command.isEnabled ).to.be.false;
			} );
		} );

		describe( 'when selection is not collapsed', () => {
			it( 'should be true if there is at least one node in selection that can have the attribute', () => {
				setData( model, '<paragraph>[foo]</paragraph>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if there are no nodes in selection that can have the attribute', () => {
				setData( model, '<x>[foo]</x>' );
				expect( command.isEnabled ).to.be.false;
			} );

			describe( 'for linkable block elements', () => {
				beforeEach( () => {
					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
				} );

				it( 'should be true when a linkable is selected', () => {
					setData( model, '[<linkableBlock selfRequestHref="foo"></linkableBlock>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a linkable and a text are selected', () => {
					setData( model, '[<linkableBlock selfRequestHref="foo"></linkableBlock>Foo]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a text and a linkable are selected', () => {
					setData( model, '[Foo<linkableBlock selfRequestHref="foo"></linkableBlock>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when two linkables are selected', () => {
					setData( model, '[<linkableBlock selfRequestHref="foo"></linkableBlock><linkableBlock selfRequestHref="foo"></linkableBlock>]' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be false when a fake linkable is selected', () => {
					model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

					setData( model, '[<fake></fake>]' );

					expect( command.isEnabled ).to.be.false;
				} );

				it( 'should be false if a linkable does not accept the `selfRequestHref` attribute in given context', () => {
					model.schema.addAttributeCheck( ( ctx, attributeName ) => {
						if ( ctx.endsWith( '$root linkableBlock' ) && attributeName == 'selfRequestHref' ) {
							return false;
						}
					} );

					setData( model, '[<linkableBlock></linkableBlock>]' );

					expect( command.isEnabled ).to.be.false;
				} );
			} );

			describe( 'for linkable inline elements', () => {
				beforeEach( () => {
					model.schema.register( 'linkableInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
				} );

				it( 'should be true when a linkable is selected', () => {
					setData( model, '<paragraph>foo [<linkableInline selfRequestHref="foo"></linkableInline>]</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a linkable and a text are selected', () => {
					setData( model, '<paragraph>foo [<linkableInline selfRequestHref="foo"></linkableInline>bar]</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when a text and a linkable are selected', () => {
					setData( model, '<paragraph>[foo<linkableInline selfRequestHref="foo"></linkableInline>]</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be true when two linkables are selected', () => {
					setData( model,
						'<paragraph>' +
							'foo ' +
							'[<linkableInline selfRequestHref="foo"></linkableInline><linkableInline selfRequestHref="foo"></linkableInline>]' +
						'</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be false if a linkable does not accept the `selfRequestHref` attribute in given context', () => {
					model.schema.addAttributeCheck( ( ctx, attributeName ) => {
						if ( ctx.endsWith( 'linkableInline' ) && attributeName == 'selfRequestHref' ) {
							return false;
						}
					} );

					setData( model, '<paragraph>[<linkableInline></linkableInline>]</paragraph>' );

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

		describe( 'for linkable block elements', () => {
			beforeEach( () => {
				model.schema.register( 'linkableBlock', {
					isBlock: true,
					allowWhere: '$text',
					allowAttributes: [ 'selfRequestHref' ]
				} );
			} );

			it( 'should read the value from a selected linkable', () => {
				setData( model, '[<linkableBlock selfRequestHref="foo"></linkableBlock>]' );

				expect( command.value ).to.be.equal( 'foo' );
			} );

			it( 'should read the value from a selected linkable and ignore a text node', () => {
				setData( model,
					'[<linkableBlock selfRequestHref="foo"></linkableBlock>' +
					'<paragraph><$text selfRequestHref="bar">bar</$text>]</paragraph>'
				);

				expect( command.value ).to.be.equal( 'foo' );
			} );

			it( 'should read the value from a selected text node and ignore a linkable', () => {
				setData( model,
					'<paragraph>[<$text selfRequestHref="bar">bar</$text></paragraph><linkableBlock selfRequestHref="foo"></linkableBlock>]'
				);

				expect( command.value ).to.be.equal( 'bar' );
			} );

			it( 'should be undefined when a fake linkable is selected', () => {
				model.schema.register( 'fake', { isBlock: true, allowWhere: '$text' } );

				setData( model, '[<fake></fake>]' );

				expect( command.value ).to.be.undefined;
			} );
		} );

		describe( 'for linkable inline elements', () => {
			beforeEach( () => {
				model.schema.register( 'linkableInline', {
					isObject: true,
					isInline: true,
					allowWhere: '$text',
					allowAttributes: [ 'selfRequestHref' ]
				} );
			} );

			it( 'should read the value from a selected linkable', () => {
				setData( model, '<paragraph>[<linkableInline selfRequestHref="foo"></linkableInline>]</paragraph>' );

				expect( command.value ).to.be.equal( 'foo' );
			} );

			// NOTE: The command value should most likely be "foo" but this requires a lot changes in refresh()
			// because it relies on getSelectedElement()/getSelectedBlocks() and neither will return the inline widget
			// in this case.
			it( 'should not read the value from a selected linkable when a linked text follows it', () => {
				setData( model,
					'<paragraph>[<linkableInline selfRequestHref="foo"></linkableInline><$text selfRequestHref="bar">bar</$text>]</paragraph>'
				);

				expect( command.value ).to.be.undefined;
			} );

			it( 'should read the value from a selected text node and ignore a linkable', () => {
				setData( model,
					'<paragraph>[<$text selfRequestHref="bar">bar</$text><linkableInline selfRequestHref="foo"></linkableInline>]</paragraph>'
				);

				expect( command.value ).to.be.equal( 'bar' );
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
				setData( model, '<paragraph>f[oo</paragraph><paragraph>ba]r</paragraph>' );

				expect( command.value ).to.be.undefined;

				command.execute( 'url' );

				expect( getData( model ) ).to.equal(
					'<paragraph>f[<$text selfRequestHref="url">oo</$text></paragraph><paragraph><$text selfRequestHref="url">ba</$text>]r</paragraph>'
				);
				expect( command.value ).to.equal( 'url' );
			} );

			describe( 'for block elements allowing selfRequestHref', () => {
				it( 'should set `selfRequestHref` attribute to allowed elements', () => {
					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );

					setData( model, '<paragraph>f[oo<linkableBlock></linkableBlock>ba]r</paragraph>' );

					expect( command.value ).to.be.undefined;

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text selfRequestHref="url">oo</$text>' +
							'<linkableBlock selfRequestHref="url"></linkableBlock>' +
							'<$text selfRequestHref="url">ba</$text>]r' +
						'</paragraph>'
					);
					expect( command.value ).to.equal( 'url' );
				} );

				it( 'should set `selfRequestHref` attribute to nested allowed elements', () => {
					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
					model.schema.register( 'blockQuote', { allowWhere: '$block', allowContentOf: '$root' } );

					setData( model,
						'<paragraph>foo</paragraph>[<blockQuote><linkableBlock></linkableBlock></blockQuote>]<paragraph>bar</paragraph>'
					);

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>foo</paragraph>' +
							'[<blockQuote><linkableBlock selfRequestHref="url"></linkableBlock></blockQuote>]' +
						'<paragraph>bar</paragraph>' );
				} );

				it( 'should set `selfRequestHref` attribute to allowed elements on multi-selection', () => {
					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );

					setData( model, '<paragraph>[<linkableBlock></linkableBlock>][<linkableBlock></linkableBlock>]</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'[<linkableBlock selfRequestHref="url"></linkableBlock>][<linkableBlock selfRequestHref="url"></linkableBlock>]' +
						'</paragraph>'
					);
				} );

				it( 'should set `selfRequestHref` attribute to allowed elements and omit disallowed', () => {
					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text'
					} );
					model.schema.register( 'caption', { allowIn: 'linkableBlock' } );
					model.schema.extend( '$text', { allowIn: 'caption' } );

					setData( model, '<paragraph>f[oo<linkableBlock><caption>xxx</caption></linkableBlock>ba]r</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text selfRequestHref="url">oo</$text>' +
							'<linkableBlock><caption><$text selfRequestHref="url">xxx</$text></caption></linkableBlock>' +
							'<$text selfRequestHref="url">ba</$text>]r' +
						'</paragraph>'
					);
				} );

				it( 'should set `selfRequestHref` attribute to allowed elements and omit their children even if they accept the attribute', () => {
					model.schema.register( 'linkableBlock', {
						isBlock: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
					model.schema.register( 'caption', { allowIn: 'linkableBlock' } );
					model.schema.extend( '$text', { allowIn: 'caption' } );

					setData( model, '<paragraph>f[oo<linkableBlock><caption>xxx</caption></linkableBlock>ba]r</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text selfRequestHref="url">oo</$text>' +
							'<linkableBlock selfRequestHref="url"><caption>xxx</caption></linkableBlock>' +
							'<$text selfRequestHref="url">ba</$text>]r' +
						'</paragraph>'
					);
				} );
			} );

			describe( 'for inline elements allowing selfRequestHref', () => {
				it( 'should set `selfRequestHref` attribute to allowed elements', () => {
					model.schema.register( 'linkableInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );

					setData( model, '<paragraph>f[oo<linkableInline></linkableInline>ba]r</paragraph>' );

					expect( command.value ).to.be.undefined;

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'f[<$text selfRequestHref="url">oo</$text>' +
							'<linkableInline selfRequestHref="url"></linkableInline>' +
							'<$text selfRequestHref="url">ba</$text>]r' +
						'</paragraph>'
					);

					expect( command.value ).to.equal( 'url' );
				} );

				it( 'should set `selfRequestHref` attribute to nested allowed elements', () => {
					model.schema.register( 'linkableInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );
					model.schema.register( 'blockQuote', { allowWhere: '$block', allowContentOf: '$root' } );

					setData( model,
						'<paragraph>foo</paragraph>' +
							'[<blockQuote><linkableInline></linkableInline></blockQuote>]' +
						'<paragraph>bar</paragraph>'
					);

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>foo</paragraph>' +
							'[<blockQuote><linkableInline selfRequestHref="url"></linkableInline></blockQuote>]' +
						'<paragraph>bar</paragraph>'
					);
				} );

				it( 'should set `selfRequestHref` attribute to allowed elements on multi-selection', () => {
					model.schema.register( 'linkableInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref' ]
					} );

					setData( model, '<paragraph>[<linkableInline></linkableInline>][<linkableInline></linkableInline>]</paragraph>' );

					command.execute( 'url' );

					expect( getData( model ) ).to.equal(
						'<paragraph>' +
							'[<linkableInline selfRequestHref="url"></linkableInline>][<linkableInline selfRequestHref="url"></linkableInline>]' +
						'</paragraph>'
					);
				} );
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
					if ( ctx.endsWith( 'paragraph $text' ) && attributeName == 'selfRequestHref' ) {
						return false;
					}
				} );

				setData( model, '<paragraph>foo[]bar</paragraph>' );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<paragraph>foo[]bar</paragraph>' );
			} );

			it( 'should not insert text node if link is empty', () => {
				setData( model, '<paragraph>foo[]bar</paragraph>' );

				command.execute( '' );

				expect( getData( model ) ).to.equal( '<paragraph>foo[]bar</paragraph>' );
			} );

			// https://github.com/ckeditor/ckeditor5/issues/8210
			it( 'should insert text with `selfRequestHref` attribute just after text node with the same `selfRequestHref` attribute', () => {
				setData( model, '<$text selfRequestHref="url">foo</$text>[]bar' );

				model.change( writer => writer.overrideSelectionGravity() );

				command.execute( 'url' );

				expect( getData( model ) ).to.equal( '<$text selfRequestHref="url">foourl</$text>[]bar' );
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

					model.schema.register( 'linkableBlock', {
						allowIn: '$root',
						isObject: true,
						isBlock: true,
						allowAttributes: [ 'selfRequestHref', 'linkIsFoo', 'linkIsBar', 'linkIsSth' ]
					} );

					model.schema.register( 'linkableInline', {
						isObject: true,
						isInline: true,
						allowWhere: '$text',
						allowAttributes: [ 'selfRequestHref', 'linkIsFoo', 'linkIsBar', 'linkIsSth' ]
					} );

					model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );
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

			it( 'should update content if href is equal to content', () => {
				setData( model, '<$text selfRequestHref="url">ur[]l</$text>' );

				command.execute( 'url2', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( '<$text selfRequestHref="url2" linkIsBar="true" linkIsFoo="true" linkIsSth="true">url2</$text>[]' );
			} );

			it( 'should not add new attributes if there are falsy when href is equal to content', () => {
				setData( model, '<$text selfRequestHref="url">ur[]l</$text>' );

				command.execute( 'url2', { linkIsFoo: false, linkIsBar: false, linkIsSth: false } );

				expect( getData( model ) ).to
					.equal( '<$text selfRequestHref="url2">url2</$text>[]' );
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

			it( 'should insert additional attributes to a linkable block when it is created', () => {
				setData( model, '[<linkableBlock></linkableBlock>]' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( '[<linkableBlock selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true"></linkableBlock>]' );
			} );

			it( 'should insert additional attributes to a linkable inline element when it is created', () => {
				setData( model, '<paragraph>foo[<linkableInline></linkableInline>]bar</paragraph>' );

				command.execute( 'url', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to.equal(
					'<paragraph>' +
						'foo[<linkableInline selfRequestHref="url" linkIsBar="true" linkIsFoo="true" linkIsSth="true"></linkableInline>]bar' +
					'</paragraph>'
				);
			} );

			it( 'should update content if href is equal to content', () => {
				setData( model, '[<$text selfRequestHref="url">url</$text>]' );

				command.execute( 'url2', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal( '[<$text selfRequestHref="url2" linkIsBar="true" linkIsFoo="true" linkIsSth="true">url2</$text>]' );
			} );

			it( 'should not update content if href is equal to content but there is a non-link following in the selection', () => {
				setData( model, '<paragraph>[<$text selfRequestHref="url">url</$text>foo]</paragraph>' );

				command.execute( 'url2', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal(
						'<paragraph>[<$text selfRequestHref="url2" linkIsBar="true" linkIsFoo="true" linkIsSth="true">urlfoo</$text>]</paragraph>'
					);
			} );

			it( 'should not update content if href is equal to content but there is a non-link preceding in the selection', () => {
				setData( model, '<paragraph>[foo<$text selfRequestHref="url">url</$text>]</paragraph>' );

				command.execute( 'url2', { linkIsFoo: true, linkIsBar: true, linkIsSth: true } );

				expect( getData( model ) ).to
					.equal(
						'<paragraph>[<$text selfRequestHref="url2" linkIsBar="true" linkIsFoo="true" linkIsSth="true">foourl</$text>]</paragraph>'
					);
			} );

			it( 'should not add new attributes if there are falsy when href is equal to content', () => {
				setData( model, '[<$text selfRequestHref="url">url</$text>]' );

				command.execute( 'url2', { linkIsFoo: false, linkIsBar: false, linkIsSth: false } );

				expect( getData( model ) ).to
					.equal( '[<$text selfRequestHref="url2">url2</$text>]' );
			} );

			it( 'should not update link which is equal its href if selection is on more than one element', () => {
				setData( model,
					'<paragraph>' +
						'<$text selfRequestHref="foo">[foo</$text>' +
					'</paragraph>' +
					'<paragraph>bar</paragraph>' +
					'<paragraph>baz]</paragraph>'
				);

				command.execute( 'foooo' );

				expect( getData( model ) ).to
					.equal( '<paragraph>' +
								'[<$text selfRequestHref="foooo">foo</$text>' +
							'</paragraph>' +
							'<paragraph>' +
								'<$text selfRequestHref="foooo">bar</$text>' +
							'</paragraph>' +
							'<paragraph>' +
								'<$text selfRequestHref="foooo">baz</$text>]' +
							'</paragraph>'
					);
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

			it( 'obtain current values from the linkable block element', () => {
				setData( model, '[<linkableBlock selfRequestHref="url" linkIsBar="true"></linkableBlock>]' );

				expect( command._getDecoratorStateFromModel( 'linkIsFoo' ) ).to.be.undefined;
				expect( command._getDecoratorStateFromModel( 'linkIsBar' ) ).to.be.true;
			} );

			it( 'obtain current values from the linkable inline element', () => {
				setData( model, '<paragraph>[<linkableInline selfRequestHref="url" linkIsBar="true"></linkableInline>]</paragraph>' );

				expect( command._getDecoratorStateFromModel( 'linkIsFoo' ) ).to.be.undefined;
				expect( command._getDecoratorStateFromModel( 'linkIsBar' ) ).to.be.true;
			} );
		} );
	} );

	describe( '#automaticDecorators', () => {
		it( 'is defined', () => {
			expect( command.automaticDecorators ).to.be.an.instanceOf( AutomaticDecorators );
		} );
	} );
} );

function decoratorStates( manualDecorators ) {
	return Array.from( manualDecorators ).reduce( ( accumulator, currentValue ) => {
		accumulator[ currentValue.id ] = currentValue.value;
		return accumulator;
	}, {} );
}
