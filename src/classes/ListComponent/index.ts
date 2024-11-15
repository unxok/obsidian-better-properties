import { arrayMove } from "@/libs/utils/pure";
import { Setting, TextComponent, ValueComponent } from "obsidian";

export abstract class ListComponent<T> extends ValueComponent<T[]> {
	public itemsContainerEl: HTMLElement;
	private onChangeCallback: (value: T[]) => void = () => {};

	constructor(
		public containerEl: HTMLElement,
		public defaultItemValue: T,
		public items: T[] = []
	) {
		super();
		this.itemsContainerEl = containerEl.createDiv();
		this.renderItems();
	}

	abstract renderItem(value: T, setting: Setting, index: number): void;

	setValue(items: T[]): this {
		this.items = [...items];
		this.onChangeCallback(this.items);
		this.renderItems();
		return this;
	}

	getValue(): T[] {
		return [...this.items];
	}

	public onChange(cb: (value: T[]) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	protected updateItemValue(value: T, index: number): this {
		this.items[index] = value;
		this.onChangeCallback([...this.items]);
		return this;
	}

	protected renderItems(movedIndex?: number): this {
		this.itemsContainerEl.empty();
		this.items.forEach((value, index) => {
			const setting = new Setting(this.itemsContainerEl).then((s) =>
				s.infoEl.remove()
			);
			if (movedIndex === index) {
				setting.settingEl.addClass("better-properties-background-fade");
			}
			this.renderItem(value, setting, index);
		});

		return this;
	}

	protected addMoveUpButton(setting: Setting, index: number): Setting {
		setting.addExtraButton((cmp) =>
			cmp.setIcon("chevron-up").onClick(() => {
				if (index <= 0) return;
				this.items = arrayMove([...this.items], index, index - 1);
				this.onChangeCallback([...this.items]);
				this.renderItems(index - 1);
			})
		);
		return setting;
	}

	protected addMoveDownButton(setting: Setting, index: number): Setting {
		setting.addExtraButton((cmp) =>
			cmp.setIcon("chevron-down").onClick(() => {
				if (index >= this.items.length - 1) return;
				this.items = arrayMove([...this.items], index, index + 1);
				this.onChangeCallback([...this.items]);
				this.renderItems(index + 1);
			})
		);
		return setting;
	}

	protected addDeleteButton(setting: Setting, index: number): Setting {
		setting.addExtraButton((cmp) =>
			cmp.setIcon("x").onClick(() => {
				const copy = [...this.items];
				this.items = [...copy.slice(0, index), ...copy.slice(index + 1)];
				this.onChangeCallback([...this.items]);
				this.renderItems(index + 1);
			})
		);
		return setting;
	}

	public createNewItemButton(): this {
		new Setting(this.containerEl).addButton((cmp) =>
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

export class TextListComponent extends ListComponent<string> {
	renderItem(value: string, setting: Setting, index: number): void {
		new TextComponent(setting.controlEl)
			.setValue(value)
			.onChange((v) => this.updateItemValue(v, index))
			.inputEl.classList.add("better-properties-text-list-component-input");
		this.addMoveUpButton(setting, index);
		this.addMoveDownButton(setting, index);
		this.addDeleteButton(setting, index);
	}
}
