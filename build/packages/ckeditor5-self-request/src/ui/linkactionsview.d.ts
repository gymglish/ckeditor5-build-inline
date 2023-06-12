/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
/**
 * @module link/ui/linkactionsview
 */
import { ButtonView, View } from 'ckeditor5/src/ui';
import { FocusTracker, KeystrokeHandler, type LocaleTranslate } from 'ckeditor5/src/utils';
import { Editor } from 'ckeditor5/src/core';
import '@ckeditor/ckeditor5-ui/theme/components/responsive-form/responsiveform.css';
import '../../theme/linkactions.css';
/**
 * The link actions view class. This view displays the link preview, allows
 * unlinking or editing the link.
 */
export default class LinkActionsView extends View {
    /**
     * Tracks information about DOM focus in the actions.
     */
    readonly focusTracker: FocusTracker;
    /**
     * An instance of the {@link module:utils/keystrokehandler~KeystrokeHandler}.
     */
    readonly keystrokes: KeystrokeHandler;
    /**
     * The href preview view.
     */
    previewButtonView: View;
    /**
     * The unlink button view.
     */
    unlinkButtonView: ButtonView;
    /**
     * The edit link button view.
     */
    editButtonView: ButtonView;
    /**
     * The value of the "href" attribute of the link to use in the {@link #previewButtonView}.
     *
     * @observable
     */
    href: string | undefined;
    /**
     * A collection of views that can be focused in the view.
     */
    private readonly _focusables;
    /**
     * Helps cycling over {@link #_focusables} in the view.
     */
    private readonly _focusCycler;
    private readonly editor;
    private coverSub;
    private covers;
    t: LocaleTranslate;
    /**
     * @inheritDoc
     */
    constructor(editor: Editor);
    /**
     * @inheritDoc
     */
    render(): void;
    /**
     * @inheritDoc
     */
    destroy(): void;
    /**
     * Focuses the fist {@link #_focusables} in the actions.
     */
    focus(): void;
    /**
     * Creates a button view.
     *
     * @param label The button label.
     * @param icon The button icon.
     * @param eventName An event name that the `ButtonView#execute` event will be delegated to.
     * @returns The button view instance.
     */
    private _createButton;
    /**
     * Creates a link href preview button.
     * @param href The href attribute of the link.
     * @returns The button view instance.
     * @private
     * @returns {string}
     * @memberof LinkActionsView
     */
    private getUrl;
    /**
     * Creates a link href preview button.
     *
     * @returns The button view instance.
     */
    private _createPreviewButton;
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
