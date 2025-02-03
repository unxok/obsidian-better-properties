import { obsidianText } from "@/i18Next/defaultObsidian";
import { createDragHandle } from "@/libs/utils/drag";
import { arrayMove } from "@/libs/utils/pure";
import {
	ButtonComponent,
	Menu,
	setIcon,
	Setting,
	TextComponent,
	ValueComponent,
} from "obsidian";

export abstract class ListComponent<T> extends ValueComponent<T[]> {
	public itemsContainerEl: HTMLElement;
	public toolbarSetting: Setting;
	private onChangeCallback: (value: T[]) => void = () => {};

	constructor(
		public containerEl: HTMLElement,
		public defaultItemValue: T,
		public items: T[] = []
	) {
		super();
		this.itemsContainerEl = containerEl.createDiv();
		this.toolbarSetting = new Setting(containerEl.createDiv());
		// if additional properties are added in the constructor than this will run before those are attached to the instance
		// this.renderItems();
	}

	abstract renderItem(
		value: T,
		setting: Setting,
		index: number,
		shouldFocus?: boolean
	): void;

	setValue(items: T[]): this {
		this.items = [...items];
		this.onChangeCallback([...items]);
		this.renderItems();
		return this;
	}

	getValue(): T[] {
		return [...this.items];
	}

	public setValueHighlight(items: T[], highlightIndex: number): this {
		this.items = [...items];
		this.onChangeCallback([...items]);
		this.renderItems(highlightIndex);
		return this;
	}

	public onChange(cb: (value: T[]) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	protected updateItemValue(fn: (value: T) => T, index: number): this;
	protected updateItemValue(value: T, index: number): this;
	protected updateItemValue(value: T | ((value: T) => T), index: number): this {
		if (typeof value !== "function") {
			this.items[index] = value;
			this.onChangeCallback([...this.items]);
			return this;
		}

		// TODO I should make these separate methods so I don't have to do this
		const newValue = (value as Function)(this.items[index]);
		this.updateItemValue(newValue, index);

		return this;
	}

	public renderItems(movedIndex?: number): this {
		this.itemsContainerEl.empty();
		this.items.forEach((value, index) => {
			const setting = new Setting(this.itemsContainerEl).then((s) =>
				s.infoEl.remove()
			);
			if (movedIndex === index) {
				setting.settingEl.addClass("better-properties-background-fade");
			}
			this.renderItem(value, setting, index, index === movedIndex);
		});

		return this;
	}

	protected addMoveUpButton(setting: Setting, index: number): Setting {
		setting.addButton((cmp) =>
			cmp
				.setClass("clickable-icon")
				.setIcon("chevron-up")
				.onClick(() => {
					if (index <= 0) return;
					this.items = arrayMove([...this.items], index, index - 1);
					this.onChangeCallback([...this.items]);
					this.renderItems(index - 1);
				})
		);
		return setting;
	}

	protected addMoveDownButton(setting: Setting, index: number): Setting {
		setting.addButton((cmp) =>
			cmp
				.setClass("clickable-icon")
				.setIcon("chevron-down")
				.onClick(() => {
					if (index >= this.items.length - 1) return;
					this.items = arrayMove([...this.items], index, index + 1);
					this.onChangeCallback([...this.items]);
					this.renderItems(index + 1);
				})
		);
		return setting;
	}

	protected addDeleteButton(setting: Setting, index: number): Setting {
		setting.addButton((cmp) =>
			cmp
				.setClass("clickable-icon")
				.setIcon("x")
				.onClick(() => {
					const copy = [...this.items];
					this.items = [...copy.slice(0, index), ...copy.slice(index + 1)];
					this.onChangeCallback([...this.items]);
					this.renderItems(index + 1);
				})
		);
		return setting;
	}

	public createNewItemButton(): this {
		this.toolbarSetting.addButton((cmp) =>
			cmp
				.setCta()
				.setIcon("plus")
				.onClick(() => {
					this.items.push(this.defaultItemValue);
					this.onChangeCallback([...this.items]);
					this.renderItems(this.items.length - 1);
				})
		);
		return this;
	}
}

// use this as a base usually
export class TextListComponent extends ListComponent<string> {
	renderItem(
		value: string,
		setting: Setting,
		index: number,
		shouldFocus: boolean
	): void {
		setting.controlEl.appendChild(
			createDragHandle({
				containerEl: setting.settingEl,
				index,
				items: this.items,
				itemsContainerEl: this.itemsContainerEl,
				onDragEnd: (items, from, to) =>
					this.setValueHighlight(arrayMove(items, from, to), to),
				dragStyle: "indicator",
			})
		);
		new TextComponent(setting.controlEl)
			.setValue(value)
			.onChange((v) => this.updateItemValue(v, index))
			.then((cmp) => {
				cmp.inputEl.classList.add(
					"better-properties-text-list-component-input"
				);
				if (!shouldFocus) return;
				cmp.inputEl.focus();
			});
		// this.addMoveUpButton(setting, index);
		// this.addMoveDownButton(setting, index);
		this.addDeleteButton(setting, index);
	}

	public createSortAlphabetical(): this {
		this.toolbarSetting.addButton((cmp) =>
			cmp
				.setIcon("sort-asc")
				.setClass("clickable-icon")
				.setTooltip(obsidianText("plugins.file-explorer.action-change-sort"))
				.onClick((e) => {
					new Menu()
						.addItem((item) =>
							item
								.setTitle(
									obsidianText("plugins.file-explorer.label-sort-a-to-z")
								)
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => a.localeCompare(b))
									)
								)
						)
						.addItem((item) =>
							item
								.setTitle(
									obsidianText("plugins.file-explorer.label-sort-z-to-a")
								)
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => b.localeCompare(a))
									)
								)
						)
						.showAtMouseEvent(e);
				})
		);
		return this;
	}
}
