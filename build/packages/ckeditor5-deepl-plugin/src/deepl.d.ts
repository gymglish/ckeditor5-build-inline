import { Editor } from '@ckeditor/ckeditor5-core';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import CharacterGridView from '@ckeditor/ckeditor5-special-characters/src/ui/charactergridview';
import CharacterInfoView from '@ckeditor/ckeditor5-special-characters/src/ui/characterinfoview';
import { DropdownView } from '@ckeditor/ckeditor5-ui';
import { DeeplLanguagesObj } from '../types/types';
import SpecialCharactersNavigationViewExtended from './specialcharactersnavigationviewextended';
export default class Deepl extends Plugin {
    _languages: Map<string, string>;
    _groups: Map<string, any>;
    constructor(editor: Editor);
    init(): void;
    addLanguages(groupName: string, languages: DeeplLanguagesObj[], options?: {
        label: string;
    }): void;
    _getGroup(groupName: string, label: string): any;
    _createDropdownPanelContent(locale: any, dropdownView: DropdownView): {
        navigationView: SpecialCharactersNavigationViewExtended;
        gridView: CharacterGridView;
        infoView: CharacterInfoView;
    };
    getLanguageFromFlag(flag: string): DeeplLanguagesObj | undefined;
}
