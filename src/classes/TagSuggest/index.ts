import { compareFunc } from "@/libs/utils/obsidian";
import { InputSuggest, Suggestion } from "../InputSuggest";

export class TagSuggest extends InputSuggest<string> {
	protected getSuggestions(query: string): string[] | Promise<string[]> {
		const { app } = this;
		const allTags = Object.keys(app.metadataCache.getTags())
			.map((t) => t.slice(1))
			.sort(compareFunc);
		if (!query) return allTags;
		const lower = query.toLowerCase();
		return allTags.filter((t) => t.toLowerCase().includes(lower));
	}

	protected parseSuggestion(value: string): Suggestion {
		return {
			title: value,
		};
	}

	protected onRenderSuggestion(
		_value: string,
		_contentEl: HTMLDivElement,
		_titleEl: HTMLDivElement,
		_noteEl?: HTMLDivElement,
		_auxEl?: HTMLDivElement,
		_icon?: string
	): void {
		return;
	}

	selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
		this.component.setValue(value);
		this.component.onChanged();
	}
}
