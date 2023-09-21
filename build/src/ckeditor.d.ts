/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
import InlineEditorBase from '@ckeditor/ckeditor5-editor-inline/src/inlineeditor';
import { Essentials } from '@ckeditor/ckeditor5-essentials';
import { Autoformat } from '@ckeditor/ckeditor5-autoformat';
import { Bold, Italic, Strikethrough, Underline, Subscript, Superscript } from '@ckeditor/ckeditor5-basic-styles';
import { SpecialCharacters, SpecialCharactersEssentials } from '@ckeditor/ckeditor5-special-characters';
import { BlockQuote } from '@ckeditor/ckeditor5-block-quote';
import { CKBox } from '@ckeditor/ckeditor5-ckbox';
import { EasyImage } from '@ckeditor/ckeditor5-easy-image';
import { Heading } from '@ckeditor/ckeditor5-heading';
import { Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, PictureEditing } from '@ckeditor/ckeditor5-image';
import { Link } from '@ckeditor/ckeditor5-link';
import { List } from '@ckeditor/ckeditor5-list';
import { MediaEmbed } from '@ckeditor/ckeditor5-media-embed';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph';
import { PasteFromOffice } from '@ckeditor/ckeditor5-paste-from-office';
import { Table, TableToolbar } from '@ckeditor/ckeditor5-table';
import { TextTransformation } from '@ckeditor/ckeditor5-typing';
import { CloudServices } from '@ckeditor/ckeditor5-cloud-services';
import { Highlight } from '@ckeditor/ckeditor5-highlight';
import { Mention } from '@ckeditor/ckeditor5-mention';
import SelfRequest from '../packages/ckeditor5-self-request/src/link';
export default class InlineEditor extends InlineEditorBase {
    static builtinPlugins: (typeof TextTransformation | typeof Essentials | typeof Autoformat | typeof Superscript | typeof Subscript | typeof Bold | typeof Italic | typeof Strikethrough | typeof Underline | typeof SpecialCharacters | typeof SpecialCharactersEssentials | typeof BlockQuote | typeof CloudServices | typeof CKBox | typeof EasyImage | typeof Paragraph | typeof Heading | typeof Image | typeof ImageCaption | typeof ImageStyle | typeof ImageToolbar | typeof ImageUpload | typeof Link | typeof List | typeof MediaEmbed | typeof PasteFromOffice | typeof Table | typeof TableToolbar | typeof Highlight | typeof Mention | typeof SelfRequest | typeof PictureEditing)[];
    static defaultConfig: {
        toolbar: {
            items: string[];
        };
        image: {
            toolbar: string[];
        };
        table: {
            contentToolbar: string[];
        };
        language: string;
    };
}
