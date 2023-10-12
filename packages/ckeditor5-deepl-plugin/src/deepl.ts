import { Editor } from '@ckeditor/ckeditor5-core';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import CharacterGridView from '@ckeditor/ckeditor5-special-characters/src/ui/charactergridview';
import CharacterInfoView from '@ckeditor/ckeditor5-special-characters/src/ui/characterinfoview';
import SpecialCharactersView from '@ckeditor/ckeditor5-special-characters/src/ui/specialcharactersview';
import { DropdownView, createDropdown } from '@ckeditor/ckeditor5-ui';
import imageIcon from '../theme/icons/DeepL_Logo_darkBlue_v2.svg';
import { DeeplLanguages, DeeplLanguagesObj, ExtendedParameters } from '../types/types';
import SpecialCharactersNavigationViewExtended from './specialcharactersnavigationviewextended';
import TranslateCommand from './translationcommand';

const DEEPL_LANGUAGES: DeeplLanguagesObj[] = [
  { label: 'Bulgarian', value: 'BG', flag: '🇧🇬' },
  { label: 'Czech', value: 'CS', flag: '🇨🇿' },
  { label: 'Danish', value: 'DA', flag: '🇩🇰' },
  { label: 'German', value: 'DE', flag: '🇩🇪' },
  { label: 'Greek', value: 'EL', flag: '🇬🇷' },
  { label: 'English (British)', value: 'EN-GB', flag: '🇬🇧' },
  { label: 'English (American)', value: 'EN-US', flag: '🇺🇸' },
  { label: 'Spanish', value: 'ES', flag: '🇪🇸' },
  { label: 'Estonian', value: 'ET', flag: '🇪🇪' },
  { label: 'Finnish', value: 'FI', flag: '🇫🇮' },
  { label: 'French', value: 'FR', flag: '🇫🇷' },
  { label: 'Hungarian', value: 'HU', flag: '🇭🇺' },
  { label: 'Indonesian', value: 'ID', flag: '🇮🇩' },
  { label: 'Italian', value: 'IT', flag: '🇮🇹' },
  { label: 'Japanese', value: 'JA', flag: '🇯🇵' },
  { label: 'Korean', value: 'KO', flag: '🇰🇷' },
  { label: 'Lithuanian', value: 'LT', flag: '🇱🇹' },
  { label: 'Latvian', value: 'LV', flag: '🇱🇻' },
  { label: 'Norwegian (Bokmål)', value: 'NB', flag: '🇳🇴' },
  { label: 'Dutch', value: 'NL', flag: '🇳🇱' },
  { label: 'Polish', value: 'PL', flag: '🇵🇱' },
  { label: 'Portuguese (Brazilian)', value: 'PT-BR', flag: '🇧🇷' },
  { label: 'Portuguese (European)', value: 'PT-PT', flag: '🇵🇹' },
  { label: 'Romanian', value: 'RO', flag: '🇷🇴' },
  { label: 'Russian', value: 'RU', flag: '🇷🇺' },
  { label: 'Slovak', value: 'SK', flag: '🇸🇰' },
  { label: 'Slovenian', value: 'SL', flag: '🇸🇮' },
  { label: 'Swedish', value: 'SV', flag: '🇸🇪' },
  { label: 'Turkish', value: 'TR', flag: '🇹🇷' },
  { label: 'Ukrainian', value: 'UK', flag: '🇺🇦' },
  { label: 'Chinese (Simplified)', value: 'ZH', flag: '🇨🇳' },
];

export default class Deepl extends Plugin {
  _languages: Map<string, string>;
  _groups: Map<string, any>;

  constructor(editor: Editor) {
    super(editor);
    this._languages = new Map();
    this._groups = new Map();
  }

  init() {
    const config = this.editor.config.get('deepl') as ExtendedParameters;
    const mandatoryConfigParams = ['free_api', 'auth_key', 'target_lang'];
    const configParams = Object.keys(config);
    const missingParams = mandatoryConfigParams.filter(param => !configParams.includes(param));
    if (missingParams.length > 0) {
      throw new Error(`Missing configuration parameters for deepl plugin: ${missingParams.join(', ')}`);
    }

    const editor = this.editor;
    editor.commands.add('translateCommand', new TranslateCommand(editor));
    const translateCommand = editor.commands.get('translateCommand') as TranslateCommand;

    editor.ui.componentFactory.add('deepl', (locale) => {
      const dropdownView = createDropdown(locale);
      let dropdownPanelContent: any;
      dropdownView.buttonView.set({
        label: "Translate with Deepl",
        icon: imageIcon,
        tooltip: true
      });
      dropdownView.bind('isEnabled').to(translateCommand);
      const supportedLanguages = config.supported_languages ? DEEPL_LANGUAGES.filter(language => config.supported_languages?.includes(language.value)) : DEEPL_LANGUAGES;
      delete config.supported_languages;
      this.addLanguages('All', supportedLanguages);
      dropdownView.on('execute', (evt, data) => {
        editor.execute('translateCommand', config, this.getLanguageFromFlag(data.character)?.value as DeeplLanguages);
        editor.editing.view.focus();
      });
      dropdownView.on('change:isOpen', () => {
        if (!dropdownPanelContent) {
          dropdownPanelContent = this._createDropdownPanelContent(locale, dropdownView);
          const translationView = new SpecialCharactersView(locale, dropdownPanelContent.navigationView, dropdownPanelContent.gridView, dropdownPanelContent.infoView);
          dropdownView.panelView.children.add(translationView);
        }
        dropdownPanelContent.infoView.set({
          character: null,
          name: null,
        });
      });
      return dropdownView;
    });
  }

  addLanguages(groupName: string, languages: DeeplLanguagesObj[], options = { label: groupName }) {
    const group = this._getGroup(groupName, options.label);
    for (const language of languages) {
      group.items.add(language);
      this._languages.set(language.flag, language.label);
    }
  }

  _getGroup(groupName: string, label: string) {
    if (!this._groups.has(groupName)) {
      this._groups.set(groupName, {
        items: new Set(),
        label
      });
    }
    return this._groups.get(groupName);
  }

  _createDropdownPanelContent(locale: any, dropdownView: DropdownView) {
    const groupEntries: Array<[string, string]> = Array
      .from(this._groups.keys())
      .map(name => ([name, this._groups.get(name).label]));
    const translationGroups = new Map(groupEntries);
    const navigationView = new SpecialCharactersNavigationViewExtended(locale, translationGroups);
    const gridView = new CharacterGridView(locale);
    const infoView = new CharacterInfoView(locale);
    gridView.delegate('execute').to(dropdownView);
    gridView.on('tileHover', (evt, data) => {
      infoView.set(data);
    });
    gridView.on('tileFocus', (evt, data) => {
      infoView.set(data);
    });

    gridView.tiles.clear();
    for (const [lang, flag] of this._languages) {
      gridView.tiles.add(gridView.createTile(lang, flag));
    }
    return { navigationView, gridView, infoView };
  }

  getLanguageFromFlag(flag: string): DeeplLanguagesObj | undefined {
    return DEEPL_LANGUAGES.find(language => language.flag === flag);
  }
}
