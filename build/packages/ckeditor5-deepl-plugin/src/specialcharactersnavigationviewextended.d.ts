import SpecialCharactersNavigationView from "@ckeditor/ckeditor5-special-characters/src/ui/specialcharactersnavigationview";
import { Locale } from "ckeditor5/src/utils";
export default class SpecialCharactersNavigationViewExtended extends SpecialCharactersNavigationView {
    constructor(locale: Locale, groupNames: Map<string, string>);
}
