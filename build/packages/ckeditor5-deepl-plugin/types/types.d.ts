import * as translate from "deepl";
export type DeeplLanguages = 'ID' | 'KO' | 'NB' | 'TR' | 'UK' | translate.DeeplLanguages;
export type DeeplLanguagesObj = {
    label: string;
    value: DeeplLanguages;
    flag: string;
};
export interface ExtendedParameters extends translate.Parameters {
    supported_languages?: DeeplLanguages[];
}