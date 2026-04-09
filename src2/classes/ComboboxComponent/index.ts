import { BetterProperties } from "#/Plugin";
import { ValueComponent } from "obsidian";
import { Suggestion, AbstractSearchSuggest } from "~/classes/InputSuggest";
import "./index.css";

export class ComboboxComponent<T> extends ValueComponent<string> {
	searchSuggest: SearchSuggest<T>;
	controlEl: HTMLDivElement;
	clickableEl: HTMLDivElement;
	value: string = "";
	onChangeCallback: (value: string) => void = () => {};

	constructor(public plugin: BetterProperties, parentEl: HTMLElement) {
		super();
		this.controlEl = parentEl.createDiv({
			cls: "better-properties--combobox-control",
			attr: {
				tabindex: 0,
			},
		});
		this.clickableEl = this.controlEl.createDiv({
			cls: "better-properties--combobox-clickable",
			// attr: {
			// 	tabindex: 0,
			// },
		});
		this.searchSuggest = new SearchSuggest(plugin, this.clickableEl);

		this.searchSuggest.getSuggestions = (q) => {
			this.messageEl?.remove();
			const suggestions = this.getOptionsCallback(q);
			return suggestions;
			// if (suggestions instanceof Promise) {
			// 	this.searchSuggest.isFetching = true;
			// 	this.searchSuggest.open();
			// 	this.messageEl =
			// 		this.searchSuggest.suggestions.addMessage("Loading...");
			// }
			// const awaitedSuggestions = await suggestions;
			// this.searchSuggest.isFetching = false;
			// if (awaitedSuggestions.length === 0) {
			// 	this.messageEl =
			// 		this.searchSuggest.suggestions.addMessage("No options");
			// }
			// return awaitedSuggestions;
		};
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	messageEl: HTMLElement | undefined;

	public getOptionsCallback: (query: string) => T[] | Promise<T[]> = () => {
		throw new Error("Method not implemented");
	};

	public getOptions(cb: (query: string) => T[] | Promise<T[]>): this {
		this.getOptionsCallback = cb;
		return this;
	}

	public parseSuggestion(cb: (value: T) => Suggestion): this {
		this.searchSuggest.parseSuggestion = (value) => cb(value);
		return this;
	}

	public getStringFromOption(option: T): string {
		// so TS doesn't warn for unused var
		void option;
		throw new Error("Method not implemented");
	}

	public onSelect(cb: (value: T) => void): this {
		this.searchSuggest.onSelect((value) => {
			cb(value);
			this.setValue(this.getStringFromOption(value));
			this.onChanged();
		});
		return this;
	}

	public onChange(cb: (value: string) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	public onChanged(): void {
		this.onChangeCallback(this.getValue());
	}

	public onCreate(
		cb: (query: string, evt: KeyboardEvent | MouseEvent) => void | Promise<void>
	): this {
		this.searchSuggest.onCreate(cb);
		return this;
	}
}

export class SearchSuggest<T> extends AbstractSearchSuggest<T> {
	messageEl: HTMLElement | undefined;
	isFetching: boolean = false;
	createEl: HTMLElement | undefined;
	onCreateCallback:
		| ((query: string, evt: KeyboardEvent | MouseEvent) => void | Promise<void>)
		| undefined;
	onRenderSuggestionCallback: (value: T, el: HTMLElement) => void = () => {};
	onOpenCallback: () => void = () => {};

	parseSuggestion(suggestion: T): Suggestion {
		// so TS doesn't warn for unused var
		void suggestion;
		throw new Error("Method not implemented");
	}

	getSuggestions(query: string): T[] | Promise<T[]> {
		// so TS doesn't warn for unused var
		void query;
		throw new Error("Method not implemented");
	}

	getDefaultSuggestion(): T {
		throw new Error("Method not implemented");
	}

	canCreate(query: string, values: T[]): boolean {
		// so TS doesn't warn for unused var
		void query;
		void values;
		return !!this.onCreateCallback;
	}

	onCreate(
		cb: (query: string, evt: KeyboardEvent | MouseEvent) => void | Promise<void>
	): void {
		this.onCreateCallback = cb;
	}

	onOpen(cb: () => void): this {
		this.onOpenCallback = cb;
		return this;
	}

	override open() {
		super.open();
		this.onOpenCallback();
	}

	override async onEnter(e: KeyboardEvent): Promise<void> {
		if (e.ctrlKey && this.onCreateCallback) {
			await this.onCreateCallback(this.search.getValue(), e);
			return;
		}

		super.onEnter(e);
	}

	override showSuggestions(values: T[]): void {
		if (values.length === 0) {
			super.showSuggestions([this.getDefaultSuggestion()]);
		}
		if (values.length !== 0) {
			super.showSuggestions(values);
		}
		this.messageEl?.remove();
		// this.footerContainerEl.empty();
		this.createEl?.remove();
		const query = this.getValue();
		// if (this.isFetching) {

		// };
		const { onCreateCallback } = this;
		if (this.canCreate(query, values) && onCreateCallback) {
			this.createEl = this.addFooterItem({
				icon: "lucide-plus",
				title: `Create item "${query}"`,
				aux: "Ctrl + Enter",
				onClick: async (e) => await onCreateCallback(query, e),
			});
		}
		if (!values.length) {
			this.suggestions.setSuggestions([]);
			const msg = query ? `No results for "${query}"` : `No results`;
			this.messageEl = this.suggestions.addMessage(msg);
		}
	}

	onRenderSuggestion(cb: (value: T, el: HTMLElement) => void): this {
		this.onRenderSuggestionCallback = cb;
		return this;
	}

	override renderSuggestion(value: T, el: HTMLElement): void {
		super.renderSuggestion(value, el);
		this.onRenderSuggestionCallback(value, el);
	}
}
