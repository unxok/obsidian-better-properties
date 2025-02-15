// TRANSLATIONS done
import {
	AbstractInputSuggest,
	App,
	SearchComponent,
	setIcon,
	TextComponent,
} from "obsidian";

export type Suggestion = {
	title: string;
	note?: string;
	aux?: string;
	icon?: string;
};

export abstract class InputSuggest<T> extends AbstractInputSuggest<T> {
	component: SearchComponent | TextComponent;

	constructor(app: App, component: SearchComponent | TextComponent) {
		super(app, component.inputEl);
		this.component = component;
	}

	/**
	 * Get the suggestions for the popover
	 */
	protected abstract getSuggestions(query: string): T[] | Promise<T[]>;

	/**
	 * Convert a suggestion value of type `T` to the `Suggestion` type
	 */
	protected abstract parseSuggestion(value: T): Suggestion;

	/**
	 * Use to further mutate how suggestions are rendered.
	 * @remark If not needed, simply define as an empty function-- `onRenderSuggestion() {}`
	 */
	protected abstract onRenderSuggestion(
		value: T,
		contentEl: HTMLElement,
		titleEl: HTMLElement,
		noteEl?: HTMLElement,
		auxEl?: HTMLElement,
		icon?: string
	): void;

	/**
	 * What to do when a suggestion is clicked with the mouse or keyboard
	 */
	abstract selectSuggestion(value: T, evt: MouseEvent | KeyboardEvent): void;

	/**
	 * Renders suggestions.
	 * @remark Do **NOT** override this! Use `this.onRenderSuggestion()` if you need to mutate the suggestion DOM elements
	 */
	renderSuggestion(value: T, el: HTMLElement): void {
		const { title, aux, note, icon } = this.parseSuggestion(value);
		el.classList.add("mod-complex");
		if (icon) {
			const iconEl = el
				.createDiv({ cls: "suggestion-icon" })
				.createSpan({ cls: "suggestion-flair" });
			setIcon(iconEl, icon);
		}
		const contentEl = el.createDiv({ cls: "suggestion-content" });
		const titleEl = contentEl.createDiv({
			cls: "suggestion-title",
			text: title,
		});
		const noteEl =
			note === undefined
				? undefined
				: contentEl.createDiv({ cls: "suggestion-note", text: note });
		const auxEl =
			aux === undefined
				? undefined
				: el
						.createDiv({ cls: "suggestion-aux" })
						.createSpan({ cls: "suggestion-flair", text: aux });
		this.onRenderSuggestion(value, contentEl, titleEl, noteEl, auxEl);
	}
}
