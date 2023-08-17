/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

declare module '*.svg' {
	const content: string;
	export default content;
}

declare module '@webspellchecker/wproofreader-ckeditor5/src/wproofreader' {
	import { Plugin } from '@ckeditor/ckeditor5-core';

	export default class WProofreader extends Plugin {
		static readonly pluginName: 'WProofreader';
	}
}
