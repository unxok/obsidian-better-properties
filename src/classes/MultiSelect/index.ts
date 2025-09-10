import { App, Constructor, Setting } from "obsidian";
import { InputSuggest } from "../InputSuggest";
// import {  Multiselect } from "obsidian-typings";

export const resolveMultiSelectPrototype = (app: App) => {
	const widget = app.metadataTypeManager.registeredTypeWidgets["tags"];
	if (!widget) {
		throw new Error("Tags widget not found");
	}
	const el = createDiv();
	const cmp = widget.render(el, [], {
		app,
		blur: () => {},
		key: "tags",
		onChange: () => {},
		sourcePath: "",
	});

	const { multiselect } = cmp;
	const MultiSelectClass = Object.getPrototypeOf(multiselect).constructor;
	return MultiSelectClass as Constructor<Multiselect>;
};

interface Multiselect {
	constructor(parentEl: HTMLElement): void;

	elements: HTMLElement[];
	inputEl: HTMLElement;
	rootEl: HTMLElement;
	values: string[];
	changeCallback: (value: string[]) => void;
	createOption: (item: string) => void;
	findDuplicate: (item: string, value: string[]) => number;
	optionsRenderer: (
		item: string,
		dom: {
			el: HTMLElement;
			pillEl: HTMLElement;
		}
	) => void;
	onOptionContextmenu: () => void;
	setupInput: (
		inputEl: HTMLElement,
		/**
		 * @remark This dones't seem to do anything
		 */
		update: (item: string, index: number) => void
	) => void;
	readonly inputText: string;

	onChange(cb: this["changeCallback"]): this;
	allowCreatingOptions(cb: this["createOption"]): this;
	preventDuplicates(cb: this["findDuplicate"]): this;
	setOptionRenderer(cb: this["optionsRenderer"]): this;
	addElement(item: string): this;
	_createElement(item: string): this;
	editElement(index: number): this;
	focusElement(index: number): this;
	removeElement(index: number): this;
	renderValues(): this;
	setInputText(text: string): void;
	setOptionContextmenuHandler(cb: this["onOptionContextmenu"]): this;
	setValues(value: string[]): this;
	setupInputEl(cb: this["setupInput"]): this;
	triggerChange(): void;
}

export class MultiselectComponent extends resolveMultiSelectPrototype(app) {
	isInputElSuggestAdded: boolean = false;
	addSuggestCallback:
		| ((inputEl: HTMLDivElement, index: number) => InputSuggest<any>) // TODO is it possible to not use `any` here? It seems like a fine usage though
		| undefined;
	constructor(parentEl: HTMLElement | Setting) {
		const el = parentEl instanceof HTMLElement ? parentEl : parentEl.controlEl;
		super(el);
	}

	addSuggest(cb: this["addSuggestCallback"]): this {
		this.addSuggestCallback = cb;
		return this;
	}

	updateAndRender(cb: (value: string[]) => string[]): this {
		const value = [...this.values];
		const updated = cb(value);
		this.setValues(updated);
		this.renderValues();
		return this;
	}

	renderValues(): this {
		super.renderValues.call(this);

		if (this.addSuggestCallback && !this.isInputElSuggestAdded) {
			this.isInputElSuggestAdded = true;
			this.addSuggestCallback(
				this.inputEl as HTMLDivElement,
				this.getItemIndex(this.inputEl)
			);
		}

		return this;
	}

	getItemIndex(inputEl: HTMLElement): number {
		const { parentElement } = inputEl;
		if (!parentElement) {
			return -1;
		}
		return Array.from(parentElement.children).indexOf(inputEl);
	}

	setupInput: (
		inputEl: HTMLElement,
		update: (item: string, index: number) => void
	) => void = (inputEl) => {
		if (this.addSuggestCallback) {
			this.addSuggestCallback(
				inputEl as HTMLDivElement,
				this.getItemIndex(inputEl)
			);
		}

		const update = (e: Event) => {
			const index = this.getItemIndex(inputEl);
			const newItem = (e.target as Element)?.textContent ?? "";

			this.updateAndRender((prev) => {
				if (this.values.contains(newItem)) {
					inputEl.textContent = this.values[index] ?? "";
					inputEl.blur();
					return prev;
				}
				if (!newItem) {
					return prev.filter((_, i) => i !== index);
				}
				prev[index] = newItem;
				return prev;
			});
		};

		inputEl.addEventListener("blur", update);
		inputEl.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			inputEl.blur();
		});
	};

	findDuplicate: (item: string, value: string[]) => number = (item, value) => {
		return value.indexOf(item);
	};

	createOption: (item: string) => void = (item) => {
		if (!item) return;
		// if (this.findDuplicate(item, this.values) !== -1) return;
		if (this.values.contains(item)) {
			this.setInputText("");
			this.inputEl.blur();
			return;
		}
		this.updateAndRender((prev) => [...prev, item]);
		this.setInputText("");
	};
}
