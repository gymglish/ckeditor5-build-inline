import View from '@ckeditor/ckeditor5-ui/src/view';
import { Locale } from '@ckeditor/ckeditor5-utils';
export type CoverListItemViewOptions = {
    label: string;
    value: string;
    isOn?: boolean;
    isNew?: boolean;
};
export default class CoverListItemView extends View {
    label: string;
    value: string;
    isOn: boolean;
    isNew: boolean;
    constructor(locale: Locale);
    highlight(): void;
    removeHighlight(): void;
}
