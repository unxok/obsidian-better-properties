import { obsidianText } from "@/i18Next/defaultObsidian";
import { arrayMove } from "@/libs/utils/pure";
import { Menu, Setting, TextComponent, ValueComponent } from "obsidian";

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
		this.renderItems();
	}

	abstract renderItem(value: T, setting: Setting, index: number): void;

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

	public addDragHandle(setting: Setting, index: number): Setting {
		const onMouseDown = (e: MouseEvent) => {
			const dragEl = setting.settingEl.cloneNode(true) as HTMLElement;
			dragEl.classList.remove("better-properties-background-fade");
			setting.settingEl.classList.add("better-properties-dragging-origin");
			const { width } = getComputedStyle(setting.settingEl);
			const { left, top } = setting.settingEl.getBoundingClientRect();
			const dragTargetEl = document.body.createDiv({
				cls: "better-properties-list-drag-target",
				attr: {
					style: `display: none; width: ${width}; left: ${left}px;`,
				},
			});
			dragEl.classList.add("better-properties-dragging");
			dragEl.style.position = "absolute";
			dragEl.style.width = width;
			dragEl.style.left = left + "px";
			dragEl.style.top = top + "px";
			console.log("left: ", left);
			// setting.settingEl.insertAdjacentElement("afterend", dragEl);
			document.body.appendChild(dragEl);

			const lastPos = {
				x: e.clientX,
				y: e.clientY,
			};

			let oldDiff = {
				x: 0,
				y: 0,
			};

			const closestItem = {
				index: -1,
				posY: -1,
			};

			const onMouseMove = (e: MouseEvent) => {
				const diffX = e.clientX - lastPos.x;
				const diffY = e.clientY - lastPos.y;

				// find closest item
				Array.from(this.itemsContainerEl.children).forEach((child, i) => {
					// to make typescript happy
					if (!(child instanceof HTMLElement)) return;

					const { top, bottom } = child.getBoundingClientRect();

					const y = i > index ? bottom : top;

					// set the first child that's not the dragged child
					if (closestItem.index === -1) {
						closestItem.index = i;
						closestItem.posY = y;
						return;
					}

					// this child is farther than the currently recorded one
					if (Math.abs(y - e.clientY) > Math.abs(closestItem.posY - e.clientY))
						return;

					// else this child is closer
					closestItem.index = i;
					closestItem.posY = y;
				});

				dragTargetEl.style.top = closestItem.posY + "px";
				if (closestItem.index !== index) {
					dragTargetEl.style.display = "block";
				} else {
					dragTargetEl.style.display = "none";
				}

				dragEl.style.left = left + oldDiff.x + diffX + "px";
				dragEl.style.top = top + oldDiff.y + diffY + "px";

				lastPos.x = e.clientX;
				lastPos.y = e.clientY;
				oldDiff.x += diffX;
				oldDiff.y += diffY;
			};

			const onMouseUp = () => {
				dragEl.remove();
				dragTargetEl.remove();
				setting.settingEl.classList.remove("better-properties-dragging-origin");
				if (closestItem.index !== index && closestItem.index !== -1) {
					this.setValueHighlight(
						arrayMove(this.items, index, closestItem.index),
						closestItem.index
					);
				}
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			};

			const onKeyDown = (e: KeyboardEvent) => {
				if (e.key !== "Escape") return;
				closestItem.index = index;
				onMouseUp();
				document.removeEventListener("keydown", onKeyDown);
			};

			document.addEventListener("keydown", onKeyDown);
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		};

		setting.addButton((cmp) =>
			cmp
				.setIcon("grip-vertical")
				.setClass("clickable-icon")
				.then((btn) => btn.buttonEl.addEventListener("mousedown", onMouseDown))
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
	renderItem(value: string, setting: Setting, index: number): void {
		this.addDragHandle(setting, index);
		new TextComponent(setting.controlEl)
			.setValue(value)
			.onChange((v) => this.updateItemValue(v, index))
			.inputEl.classList.add("better-properties-text-list-component-input");
		this.addMoveUpButton(setting, index);
		this.addMoveDownButton(setting, index);
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
