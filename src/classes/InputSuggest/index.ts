import { around, dedupe } from "monkey-around";
import {
	AbstractInputSuggest,
	Scope,
	SearchComponent,
	setIcon,
} from "obsidian";
import { monkeyAroundKey } from "~/lib/constants";
import BetterProperties from "~/main";

export type Suggestion = {
	title: string | DocumentFragment;
	note?: string | DocumentFragment;
	aux?: string | DocumentFragment;
	icon?: string;
};

export abstract class InputSuggest<T> extends AbstractInputSuggest<T> {
	/**
	 * Get the suggestions for the popover
	 * @note Make sure to utilize `this.setFilterCallback`
	 */
	protected abstract getSuggestions(query: string): T[] | Promise<T[]>;

	/**
	 * Convert a suggestion value of type `T` to the `Suggestion` type
	 */
	protected abstract parseSuggestion(value: T): Suggestion;

	/**
	 * An additional filter that must be true to render a given suggestion
	 */
	setFilterCallback: (suggestion: T) => boolean = () => true;

	/**
	 * Sets `this.setFilterCallback`
	 */
	setFilter(cb: this["setFilterCallback"]): this {
		this.setFilterCallback = cb;
		return this;
	}

	/**
	 * Renders suggestions
	 */
	renderSuggestion(value: T, el: HTMLElement): void {
		if (!this.setFilterCallback(value)) {
			el.remove();
			return;
		}

		const { title, aux, note, icon } = this.parseSuggestion(value);
		el.classList.add("mod-complex");
		if (icon) {
			const iconEl = el
				.createDiv({ cls: "suggestion-icon" })
				.createSpan({ cls: "suggestion-flair" });
			setIcon(iconEl, icon);
		}
		const contentEl = el.createDiv({ cls: "suggestion-content" });
		contentEl.createDiv({
			cls: "suggestion-title",
			text: title,
		});
		if (note !== undefined) {
			contentEl.createDiv({ cls: "suggestion-note", text: note });
		}
		if (aux !== undefined) {
			el.createDiv({ cls: "suggestion-aux" }).createSpan({
				cls: "suggestion-flair",
				text: aux,
			});
		}
	}
}

export abstract class AbstractSearchSuggest<T> extends InputSuggest<T> {
	public search: SearchComponent;
	public footerContainerEl: HTMLDivElement;
	private removeClickableElPatch: () => void = () => {};

	constructor(public plugin: BetterProperties, clickableEl: HTMLDivElement) {
		super(plugin.app, clickableEl);
		this.suggestEl.classList.add("combobox");

		clickableEl.addEventListener("click", (e) => {
			if (e.defaultPrevented) return;
			this.applyClickableElPatch();
			this.onInputChange();
		});

		this.search = new SearchComponent(this.suggestEl).setPlaceholder(
			"Search..."
		);
		this.search.onChange(() => {
			this.onInputChange();
		});

		this.search.inputEl.addEventListener("focusin", () => {
			this.suggestEl.classList.add("has-input-focus");
		});
		this.search.inputEl.addEventListener("focusout", () => {
			this.suggestEl.classList.remove("has-input-focus");
			this.close();
		});
		this.suggestEl.insertAdjacentElement("afterbegin", this.search.containerEl);

		this.footerContainerEl = this.suggestEl.createDiv({
			cls: "suggestion better-properties--suggestion-footer",
		});

		this.recreateScope();
	}

	onEnter(e: KeyboardEvent): void {
		this.suggestions.useSelectedItem(e);
	}

	recreateScope(): void {
		this.scope = new Scope(this.plugin.app.scope);

		this.scope.register(null, "ArrowUp", (e) => {
			this.suggestions.moveUp(e);
		});

		this.scope.register(null, "ArrowDown", (e) => {
			this.suggestions.moveDown(e);
		});

		this.scope.register(null, "PageUp", (e) => {
			this.suggestions.pageUp(e);
		});

		this.scope.register(null, "PageDown", (e) => {
			this.suggestions.pageDown(e);
		});

		this.scope.register(null, "Home", (e) => {
			this.suggestions.setSelectedItem(0, e);
		});

		this.scope.register(null, "End", (e) => {
			this.suggestions.setSelectedItem(this.suggestions.values.length - 1, e);
		});

		this.scope.register(null, "Enter", (e) => {
			this.onEnter(e);
		});

		this.scope.register(null, "Escape", () => {
			this.close();
		});
	}

	override getValue(): string {
		return this.search.getValue();
	}

	applyClickableElPatch() {
		this.removeClickableElPatch = around(this.textInputEl, {
			isActiveElement(old) {
				return dedupe(monkeyAroundKey, old, function () {
					return true;
				});
			},
		});
		this.plugin.register(this.removeClickableElPatch);
	}

	override open() {
		// if (this.isOpen || !this.textInputEl.isActiveElement()) return;
		if (this.isOpen) return;
		super.open();

		this.search.inputEl.focus();
	}

	override onSelect(
		cb: (value: T, evt: MouseEvent | KeyboardEvent) => void
	): this {
		super.onSelect((value, evt) => {
			cb(value, evt);
			this.close();
		});
		return this;
	}

	override close() {
		super.close();
		this.search.setValue("");
		this.removeClickableElPatch();
	}

	addFooterItem({
		icon,
		title,
		aux,
		onClick,
	}: {
		icon: string;
		title: string;
		aux?: string;
		onClick: (e: MouseEvent) => void | Promise<void>;
	}): HTMLElement {
		const itemEl = this.footerContainerEl.createDiv({
			cls: "suggestion-item mod-complex",
		});
		setIcon(
			itemEl
				.createDiv({ cls: "suggestion-icon" })
				.createDiv({ cls: "suggestion-flair" }),
			icon
		);
		itemEl
			.createDiv({ cls: "suggestion-content" })
			.createDiv({ cls: "suggestion-title", text: title });
		itemEl.addEventListener("click", onClick);

		if (aux) {
			itemEl
				.createDiv({ cls: "suggestion-aux" })
				.createDiv({ cls: "suggestion-flair", text: aux });
		}
		return itemEl;
	}
}
