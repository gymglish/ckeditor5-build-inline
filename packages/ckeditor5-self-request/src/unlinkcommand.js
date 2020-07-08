/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module link/unlinkcommand
 */

import Command from '@ckeditor/ckeditor5-core/src/command';
import findLinkRange from './findlinkrange';
import first from '@ckeditor/ckeditor5-utils/src/first';

/**
 * The unlink command. It is used by the {@link module:link/link~Link link plugin}.
 *
 * @extends module:core/command~Command
 */
export default class UnlinkCommand extends Command {
	/**
	 * @inheritDoc
	 */
	refresh() {
		const model = this.editor.model;
		const doc = model.document;

		const selectedElement = first( doc.selection.getSelectedBlocks() );

		// A check for the `LinkImage` plugin. If the selection contains an image element, get values from the element.
		// Currently the selection reads attributes from text nodes only. See #7429 and #7465.
		if ( selectedElement && selectedElement.is( 'image' ) && model.schema.checkAttribute( 'image', 'selfRequestHref' ) ) {
			this.isEnabled = model.schema.checkAttribute( selectedElement, 'selfRequestHref' );
		} else {
			this.isEnabled = model.schema.checkAttributeInSelection( doc.selection, 'selfRequestHref' );
		}
	}

	/**
	 * Executes the command.
	 *
	 * When the selection is collapsed, it removes the `selfRequestHref` attribute from each node with the same `selfRequestHref` attribute value.
	 * When the selection is non-collapsed, it removes the `selfRequestHref` attribute from each node in selected ranges.
	 *
	 * # Decorators
	 *
	 * If {@link module:link/link~LinkConfig#decorators `config.link.decorators`} is specified,
	 * all configured decorators are removed together with the `selfRequestHref` attribute.
	 *
	 * @fires execute
	 */
	execute() {
		const editor = this.editor;
		const model = this.editor.model;
		const selection = model.document.selection;
		const linkCommand = editor.commands.get( 'selfrequest' );

		model.change( writer => {
			// Get ranges to unlink.
			const rangesToUnlink = selection.isCollapsed ?
				[ findLinkRange( selection.getFirstPosition(), selection.getAttribute( 'selfRequestHref' ), model ) ] : selection.getRanges();

			// Remove `selfRequestHref` attribute from specified ranges.
			for ( const range of rangesToUnlink ) {
				writer.removeAttribute( 'selfRequestHref', range );
				// If there are registered custom attributes, then remove them during unlink.
				if ( linkCommand ) {
					for ( const manualDecorator of linkCommand.manualDecorators ) {
						writer.removeAttribute( manualDecorator.id, range );
					}
				}
			}
		} );
	}
}
