import { Command } from "@ckeditor/ckeditor5-core";
import * as translate from "deepl";
import { DeeplLanguages } from "../types/types";

export default class TranslateCommand extends Command {
  override execute(config: translate.Parameters, target_lang: DeeplLanguages) {
    const editor = this.editor;
    let id = 'read-only-deepl';
    editor.enableReadOnlyMode(id);
    let text = editor.data.get();
    translate({
      ...config,
      text,
      // @ts-ignore - missing in type definition
      target_lang,
    }).then(result => {
      const translation = result.data.translations[0].text;
      editor.data.set(translation, { batchType: { isUndoable: true } });
      editor.editing.view.focus();
    }).finally(() => {
      editor.disableReadOnlyMode(id);
    });
  }
}
