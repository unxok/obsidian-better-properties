import {
	ExtraButtonComponent,
	Menu,
	MenuItem,
	MenuPositionDef,
	MenuSeparator,
	SearchComponent,
	ValueComponent,
} from "obsidian";
import { Icon } from "~/lib/types/icons";

export abstract class ComboboxComponent<Option> extends ValueComponent<string> {
	options: Option[] = [];
	selectEl: HTMLDivElement;

	value: string = "";
	positionOffset: number = 5;

	onChangeCallback: (value: string) => void = () => {};

	constructor(public containerEl: HTMLElement) {
		super();
		this.selectEl = this.createSelectEl(containerEl);
	}

	setEmptyClass(isEmpty: boolean): void {
		const emptyCls = "data-better-properties-combobox-mod-empty";
		isEmpty && this.selectEl.classList.add(emptyCls);
		!isEmpty && this.selectEl.classList.remove(emptyCls);
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): this {
		this.value = value;
		this.selectEl.textContent = value;
		this.setEmptyClass(value === "");
		this?.auxEl?.remove();
		if (
			value !== "" &&
			!this.options.some((v) => this.getValueFromOption(v) === value)
		) {
			this.auxEl = this.createAuxEl(this.containerEl);
		}
		return this;
	}

	onChange(cb: (value: string) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	abstract getValueFromOption(option: Option): string;

	onChanged(): void {
		this.onChangeCallback(this.getValue());
	}

	commitValue(): void {
		const value = this.selectEl.textContent;
		this.setValue(value);
		this.onChanged();
	}

	createSelectEl(containerEl: HTMLElement): HTMLDivElement {
		const selectEl = containerEl.createDiv({
			cls: "better-properties-combobox-select",
			attr: {
				tabindex: "0",
				// contenteditable: "true",
				spellcheck: "false",
				role: "combobox",
			},
		});

		const initMenu = () => {
			const menu = this.createMenu();
			this.options.forEach((opt) => {
				menu.addSectionItem("body", (item) => {
					this.onRenderMenuItem(item, opt);
				});
			});
			menu.showAtElement(selectEl);
		};

		selectEl.addEventListener("click", (e) => {
			e.preventDefault();
			initMenu();
		});

		selectEl.addEventListener("keydown", (e) => {
			if (e.key !== " ") return;
			e.preventDefault();
			initMenu();
		});

		return selectEl;
	}

	auxEl: HTMLElement | undefined;

	createAuxEl(containerEl: HTMLElement): HTMLElement {
		const el = new ExtraButtonComponent(containerEl)
			.setTooltip(`Invalid value: "${this.getValue()}"`)
			.setIcon("lucide-alert-circle" satisfies Icon).extraSettingsEl;
		el.classList.add("better-properties-mod-error");
		return el;
	}

	onRenderMenuItem(item: MenuItem, option: Option): void {
		const str = this.getValueFromOption(option);
		item.setTitle(str);
		item.setChecked(str === this.value);
		item.onClick(() => {
			this.selectEl.textContent = str;
			item.menu.close();
			this.commitValue();
		});
	}

	search: SearchComponent | undefined;

	createMenu(): SearchableMenu {
		return new SearchableMenu();
	}

	filterItem(query: string, menuItem: MenuItem): boolean {
		if (!query) return true;
		const lower = query.toLowerCase();
		return menuItem.dom.innerText.toLowerCase().includes(lower);
	}

	addOptions(options: Option[]) {
		this.options = options;
	}
}

const HEADER = "header";
const BODY = "body";
const FOOTER = "footer";

type Section = typeof HEADER | typeof BODY | typeof FOOTER;

export class SearchableMenu extends Menu {
	yOffset: number = 5;
	onShowCallback: (menu: SearchableMenu) => void = () => {};

	search: SearchComponent | undefined;
	constructor() {
		super();
		this.dom.classList.add("better-properties-searchable-menu");
		this.addSections([HEADER, BODY, FOOTER]);
	}

	onShow(cb: (menu: SearchableMenu) => void): this {
		this.onShowCallback = cb;
		return this;
	}

	createSearch(): SearchComponent {
		const search = new SearchComponent(this.scrollEl);
		search.containerEl.addEventListener("click", (e) => {
			e.stopImmediatePropagation();
			e.stopPropagation();
			search.inputEl.focus();
		});
		this.scrollEl.insertAdjacentElement("afterbegin", search.containerEl);
		search.setPlaceholder("Search options...");
		search.inputEl.focus();

		search.onChange((v) => {
			this.filterItems(v);
		});
		return search;
	}

	filterItems(query: string): void {
		const lower = query.toLowerCase();
		this.items.forEach((item) => {
			if (item instanceof MenuSeparator || item.section !== BODY) return;
			const isMatch =
				!query || item.dom.innerText.toLowerCase().includes(lower);
			item.setDisabled(!isMatch);
		});
	}

	addSectionItem(section: Section, cb: (item: MenuItem) => void): this {
		super.addItem((item) => {
			item.setSection(section);
			cb(item);
		});
		return this;
	}

	override showAtPosition(position: MenuPositionDef, doc?: Document): this {
		super.showAtPosition(position, doc);

		this.search = this.createSearch();
		this.search.inputEl.focus();

		let firstItemIndex = -1;
		const checkedItemIndex = this.items.findIndex((item, index) => {
			if (item instanceof MenuSeparator) return false;
			if (firstItemIndex === -1 && item.section === BODY) {
				firstItemIndex = index;
			}
			return item.checked;
		});
		this.select(checkedItemIndex === -1 ? firstItemIndex : checkedItemIndex);
		this.onShowCallback(this);
		return this;
	}

	showAtElement(el: HTMLElement): this {
		const bounds = el.getBoundingClientRect();
		this.showAtPosition({
			x: bounds.left,
			y: bounds.bottom + this.yOffset,
		});

		return this;
	}

	close(): void {
		super.close();
		this.unload();
		this.dom.remove();
	}
}
