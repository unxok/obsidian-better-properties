import { getIconIds, setIcon } from "obsidian";
import { InputSuggest, Suggestion } from "..";

export class IconSuggest extends InputSuggest<string> {
	protected getSuggestions(query: string): string[] {
		const icons = getIconIds();
		if (!query) return icons;
		const lower = query.toLowerCase();
		return icons.filter((icon) => icon.toLowerCase().includes(lower));
	}

	protected parseSuggestion(value: string): Suggestion {
		return {
			title: value,
			icon: " ",
		};
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		super.renderSuggestion.call(this, value, el);

		const iconEl = el.querySelector(".suggestion-flair");
		if (!(iconEl instanceof HTMLElement)) return;
		setIcon(iconEl, value);
	}
}
