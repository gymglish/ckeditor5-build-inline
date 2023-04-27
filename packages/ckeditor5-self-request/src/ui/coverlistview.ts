// @ts-nocheck
import MentionsView from '@ckeditor/ckeditor5-mention/src/ui/mentionsview';


export default class CoverListView extends MentionsView {
	// Same code than MentionsView but just add offset when srolling (-40)

	select(index) {
        let indexToGet = 0;
        if (index > 0 && index < this.items.length) {
            indexToGet = index;
        }
        else if (index < 0) {
            indexToGet = this.items.length - 1;
        }
        const item = this.items.get(indexToGet);
        // Return early if item is already selected.
        if (this.selected === item) {
            return;
        }
        // Remove highlight of previously selected item.
        if (this.selected) {
            this.selected.removeHighlight();
        }
        item.highlight();
        this.selected = item;
        // Scroll the mentions view to the selected element.
        if (!this._isItemVisibleInScrolledArea(item)) {
            this.element.scrollTop = item.element.offsetTop - 40;
        }
    }
}
