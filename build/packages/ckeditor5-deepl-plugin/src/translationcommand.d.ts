import { Command } from "@ckeditor/ckeditor5-core";
import * as translate from "deepl";
import { DeeplLanguages } from "../types/types";
export default class TranslateCommand extends Command {
    execute(config: translate.Parameters, target_lang: DeeplLanguages): void;
}
