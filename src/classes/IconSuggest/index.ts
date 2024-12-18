// TRANSLATIONS done
import {
	AbstractInputSuggest,
	App,
	getIconIds,
	SearchComponent,
	setIcon,
	TextComponent,
} from "obsidian";
import { InputSuggest, Suggestion } from "../InputSuggest";

export class IconSuggest2 extends AbstractInputSuggest<string> {
	component: SearchComponent | TextComponent;

	constructor(app: App, component: SearchComponent | TextComponent) {
		super(app, component.inputEl);
		this.component = component;
	}

	protected getSuggestions(query: string): string[] | Promise<string[]> {
		const icons = getIconIds();
		if (!query) return icons;
		return icons.filter((ic) => ic.includes(query));
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.classList.add("mod-complex");
		const contentEl = el.createDiv({ cls: "suggestion-content" });
		contentEl.createDiv({ cls: "suggestion-title", text: value });
		const aux = el.createDiv({ cls: "suggestion-aux" });
		setIcon(aux, value);
	}

	selectSuggestion(value: string, _: MouseEvent | KeyboardEvent): void {
		const { component } = this;
		component.setValue(value);
		component.onChanged();
	}
}

export class IconSuggest extends InputSuggest<string> {
	constructor(...props: ConstructorParameters<typeof InputSuggest>) {
		super(...props);
	}

	protected getSuggestions(query: string): string[] | Promise<string[]> {
		const icons = getIconIds();
		if (!query) return icons;
		return icons.filter((ic) => ic.includes(query));
	}

	protected parseSuggestion(value: string): Suggestion {
		return {
			title: value,
			// aux: "",
			icon: value,
		};
	}

	protected onRenderSuggestion(
		value: string,
		_contentEl: HTMLDivElement,
		_titleEl: HTMLDivElement,
		_noteEl?: HTMLDivElement,
		auxEl?: HTMLDivElement
	): void {
		// if (!auxEl) return;
		// setIcon(auxEl, value);
	}

	selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
		this.component.setValue(value);
		this.component.onChanged();
		this.close();
	}
}
