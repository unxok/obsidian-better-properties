import { ButtonComponent, Setting } from "obsidian";
import { Icon } from "~/lib/types/icons";
import { arrayMove, clampNumber } from "~/lib/utils";

// TODO set up keyboard controls for dragging

export class ListSetting<T> extends Setting {
	itemsContainerEl: HTMLElement;
	items: Item<T>[] = [];
	footerContainerEl: HTMLElement;
	value: T[] = [];
	onCreateItemCallback: (value: T, item: Item<T>) => void = () => {};
	onChangeCallback: (value: T[]) => void = () => {};
	draggingIndex: number = -1;
	draggingOverIndex: number = -1;

	constructor(containerEl: HTMLElement) {
		super(containerEl);

		this.settingEl.classList.add("better-properties-list-setting");
		this.itemsContainerEl = this.controlEl.createDiv({
			cls: "better-properties-list-setting-items-container",
		});
		this.footerContainerEl = this.controlEl.createDiv({
			cls: "better-properties-list-setting-footer",
		});

		this.itemsContainerEl.addEventListener("dragover", (ev) => {
			ev.preventDefault();
		});
	}

	startDrag(index: number): void {
		const normalIndex = clampNumber(index, 0, this.items.length - 1);
		this.draggingIndex = normalIndex;
		this.itemsContainerEl.setAttribute("data-dragging-active", "true");
		this.items[normalIndex].settingEl.setAttribute("data-is-dragged", "true");
	}

	dragOver(index: number): void {
		// remove highlight from previous dragged over
		this.items[this.draggingOverIndex]?.settingEl.removeAttribute(
			"data-dragged-over"
		);

		const { draggingIndex } = this;
		const normalIndex = clampNumber(index, 0, this.items.length - 1);
		this.draggingOverIndex = normalIndex;
		this.items[normalIndex].settingEl.removeAttribute("data-dragged-over");
		const pos = normalIndex > draggingIndex ? "bottom" : "top";
		this.items[normalIndex].settingEl.setAttribute("data-dragged-over", pos);
	}

	endDrag(): void {
		const { draggingIndex, draggingOverIndex } = this;

		if (
			draggingIndex !== draggingOverIndex &&
			draggingIndex !== -1 &&
			draggingOverIndex !== -1
		) {
			this.value = arrayMove(this.value, draggingIndex, draggingOverIndex);
			this.onChangeCallback(this.value);
			this.renderAllItems();
			this.items[draggingOverIndex].focusCallback();
		}

		// cleanup
		this.itemsContainerEl?.removeAttribute("data-dragging-active");
		this.items[draggingOverIndex]?.settingEl.removeAttribute(
			"data-dragged-over"
		);
		this.items[draggingIndex]?.settingEl.removeAttribute("data-is-dragged");
		this.draggingIndex = -1;
		this.draggingOverIndex = -1;
	}

	addFooterButton(cb: (btn: ButtonComponent) => void): this {
		const btn = new ButtonComponent(this.footerContainerEl);
		cb(btn);
		return this;
	}

	setValue(value: T[]): this {
		this.value = value;
		return this;
	}

	addItem(value: T): this {
		this.value.push(value);
		this.onChangeCallback(this.value);
		this.renderItem(value);
		return this;
	}

	renderItem(value: T): this {
		const item = new Item(this, value);
		this.onCreateItemCallback(value, item);
		item.focusCallback();
		return this;
	}

	renderAllItems(): this {
		this.items = [];
		this.itemsContainerEl.empty();
		this.value.forEach((v) => this.renderItem(v));
		return this;
	}

	onChange(cb: (value: T[]) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	onCreateItem(cb: (value: T, item: Item<T>) => void): this {
		this.onCreateItemCallback = cb;
		return this;
	}
}

class Item<T> extends Setting {
	index: number;
	focusCallback: () => void = () => {};
	constructor(public list: ListSetting<T>, public value: T) {
		super(list.itemsContainerEl);
		this.infoEl.remove();
		list.items.push(this);
		this.index = list.items.length - 1;

		this.settingEl.addEventListener("dragenter", (ev) => this.onDragEnter(ev));
	}

	onFocus(cb: () => void): this {
		this.focusCallback = cb;
		return this;
	}

	onDragEnter(ev?: DragEvent): this {
		if (ev) {
			ev.preventDefault();
		}
		this.list.dragOver(this.index);
		return this;
	}

	onDragStart(ev?: DragEvent): this {
		if (ev?.dataTransfer) {
			ev.dataTransfer.setDragImage(createDiv(), 0, 0);
		}
		this.list.startDrag(this.index);
		return this;
	}

	onDragEnd(): this {
		this.list.endDrag();
		return this;
	}

	onKeyDown(ev: KeyboardEvent): this {
		const { draggingOverIndex } = this.list;
		if (ev.key === "ArrowUp") {
			this.onDragStart();
			this.list.dragOver(
				draggingOverIndex === -1 ? this.index - 1 : draggingOverIndex - 1
			);
		}
		if (ev.key === "ArrowDown") {
			this.onDragStart();
			this.list.dragOver(
				draggingOverIndex === -1 ? this.index + 1 : draggingOverIndex + 1
			);
		}
		if (ev.key === "Escape") {
			this.list.dragOver(-1);
			this.onDragEnd();
		}
		if (ev.key === "Enter" || ev.key === " " || ev.key === "Tab") {
			this.onDragEnd();
		}
		return this;
	}

	addDragButton(): this {
		this.addButton((btn) => {
			btn.setIcon("lucide-menu" satisfies Icon);
			const el = btn.buttonEl;
			el.classList.add("clickable-icon", "extra-setting-button");
			el.draggable = true;
			el.tabIndex = 0;
			el.addEventListener("dragstart", (ev) => this.onDragStart(ev));
			el.addEventListener("dragend", () => this.onDragEnd());
			el.addEventListener("keydown", (ev) => this.onKeyDown(ev));
		});
		return this;
	}

	addDeleteButton(): this {
		this.addButton((btn) => {
			btn.buttonEl.classList.add("clickable-icon", "extra-setting-button");
			btn.setIcon("lucide-x" satisfies Icon).onClick(() => {
				this.list.value = this.list.value.filter((_, i) => i !== this.index);
				this.list.onChangeCallback(this.list.value);
				this.list.renderAllItems();
			});
		});
		return this;
	}
}
