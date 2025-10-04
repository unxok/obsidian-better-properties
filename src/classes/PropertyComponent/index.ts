import { ValueComponent, stringifyYaml, Menu, setIcon } from "obsidian";
import {
	TypeInfo,
	PropertyWidget,
	PropertyWidgetComponentBase,
} from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { ConfirmationModal } from "../ConfirmationModal";

export class PropertyComponent extends ValueComponent<unknown> {
	propertyEl: HTMLDivElement | undefined;
	keyEl: HTMLDivElement | undefined;
	iconEl: HTMLSpanElement | undefined;
	keyInputEl: HTMLInputElement | undefined;
	valueEl: HTMLDivElement | undefined;
	mismatchEl: HTMLDivElement | undefined;

	keyWithoutDots: string;

	onChangeCallback: (v: unknown) => void = () => {};
	onUpdateKeyCallback: (key: string) => void = () => {};

	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public key: string,
		public value: unknown,
		public sourcePath: string
	) {
		super();
		this.keyWithoutDots = key.split(".").reverse()[0];
	}

	render(): PropertyWidgetComponentBase {
		this.propertyEl = this.createPropertyEl();
		this.keyEl = this.createKeyEl(this.propertyEl);
		this.iconEl = this.createIconEl(this.keyEl);
		this.keyInputEl = this.createKeyInputEl(this.keyEl);
		this.valueEl = this.createValueEl(this.propertyEl);
		this.mismatchEl = this.createMismatchEl(this.propertyEl, this.valueEl);
		return this.renderWidget(this.valueEl, this.getTypeInfo().inferred);
	}

	setValue(value: unknown): this {
		this.value = value;
		return this;
	}

	getValue(): unknown {
		return this.value;
	}

	onChange(cb: (value: unknown) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	onKeyChange(cb: (key: string) => void): this {
		this.onUpdateKeyCallback = cb;
		return this;
	}

	onChanged(): void {
		this.onChangeCallback(this.getValue());
	}

	getTypeInfo(): TypeInfo {
		return this.plugin.app.metadataTypeManager.getTypeInfo(
			this.key,
			this.value
		);
	}

	updateKey(key: string): void {
		this.onUpdateKeyCallback(key);
	}

	remove(): void {
		this.propertyEl?.remove();
	}

	async copy(): Promise<void> {
		await navigator.clipboard.writeText(
			stringifyYaml({ [this.keyWithoutDots]: this.getValue() })
		);
	}

	renderWidget(
		valueEl: HTMLDivElement,
		widget: PropertyWidget
	): PropertyWidgetComponentBase {
		valueEl.empty();
		return widget.render(valueEl, this.value, {
			app: this.plugin.app,
			blur: () => {},
			key: this.key,
			onChange: (value: unknown) => {
				this.onChangeCallback(value);
			},
			sourcePath: this.sourcePath,
		});
	}

	createPropertyEl(): HTMLDivElement {
		return this.containerEl.createDiv({
			cls: "metadata-property",
			attr: {
				"tabindex": "0",
				"data-property-key": this.key,
			},
		});
	}

	createKeyEl(propertyEl: HTMLElement): HTMLDivElement {
		return propertyEl.createDiv({ cls: "metadata-property-key" });
	}

	createIconEl(keyEl: HTMLDivElement): HTMLSpanElement {
		const iconEl = keyEl.createSpan({ cls: "metadata-property-icon" });
		setIcon(iconEl, this.getTypeInfo().expected.icon);

		iconEl.addEventListener("click", (e) => {
			new Menu()
				.addItem((item) => {
					item
						.setSection("action")
						.setTitle(obsidianText("properties.option-property-type"))
						.setIcon("lucide-info" satisfies Icon);
					item.setSubmenu();
					// sub items are added elsewhere in src/MetadataEditor
				})
				.addItem((item) =>
					item
						.setSection("clipboard")
						.setIcon("lucide-scissors" satisfies Icon)
						.setTitle(obsidianText("interface.menu.cut"))
						.onClick(async () => {
							await this.copy();
							this.remove();
						})
				)
				.addItem((item) =>
					item
						.setSection("clipboard")
						.setIcon("lucide-copy" satisfies Icon)
						.setTitle(obsidianText("interface.menu.copy"))
						.onClick(async () => {
							await this.copy();
						})
				)
				.addItem((item) =>
					item
						.setSection("clipboard")
						.setIcon("lucide-clipboard-check" satisfies Icon)
						.setTitle(obsidianText("interface.menu.paste"))
				)
				.addItem((item) =>
					item
						.setSection("danger")
						.setWarning(true)
						.setIcon("lucide-trash-2" satisfies Icon)
						.setTitle(obsidianText("interface.menu.remove"))
						.onClick(async () => {
							this.remove();
						})
				)
				.showAtMouseEvent(e);
		});

		return iconEl;
	}

	createKeyInputEl(keyEl: HTMLDivElement): HTMLInputElement {
		const keyInputEl = keyEl.createEl("input", {
			cls: "metadata-property-key-input",
			type: "text",
			attr: {
				"autocapitalize": "none",
				"enterkeyhint": "next",
				"aria-label": this.key,
			},
		});

		keyInputEl.value = this.keyWithoutDots;
		if (this.keyWithoutDots === "") {
			keyInputEl.focus();
		}

		keyInputEl.addEventListener("blur", (e) => {
			this.updateKey((e.target as EventTarget & HTMLInputElement).value);
		});

		keyInputEl.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;

			this.updateKey((e.target as EventTarget & HTMLInputElement).value);
		});

		return keyInputEl;
	}

	createValueEl(propertyEl: HTMLDivElement): HTMLDivElement {
		const el = propertyEl.createDiv({
			cls: "metadata-property-value",
		});

		el.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			if (!(e.target instanceof HTMLElement)) return;
			e.target.blur();
		});

		return el;
	}

	createMismatchEl(
		propertyEl: HTMLDivElement,
		valueEl: HTMLDivElement
	): HTMLDivElement {
		const { expected, inferred } = this.getTypeInfo();
		const mismatchEl = propertyEl.createDiv({
			cls: "clickable-icon metadata-property-warning-icon",
			attr: {
				"aria-label": obsidianText("properties.label-type-mismatch-warning", {
					type: expected.name(),
				}),
			},
		});
		setIcon(mismatchEl, "lucide-alert-triangle" satisfies Icon);

		if (expected.type === inferred.type) {
			// usually I would use an attr here, but this is how built-in properties do it
			mismatchEl.style.setProperty("display", "none");
		}

		mismatchEl.addEventListener("click", () => {
			const modal = new ConfirmationModal(this.plugin.app);
			modal.setTitle(
				obsidianText("properties.label-change-property-type", {
					type: expected.type,
				})
			);
			modal.setContent(
				obsidianText("properties.label-change-property-type-desc", {
					oldType: inferred.type,
				})
			);
			modal.addFooterButton((btn) =>
				btn
					.setButtonText(obsidianText("dialogue.button-update"))
					.setCta()
					.onClick(() => {
						modal.close();
						this.renderWidget(valueEl, expected);
					})
			);
			modal.addFooterButton((btn) =>
				btn
					.setButtonText(obsidianText("dialogue.button-cancel"))
					.onClick(() => {
						modal.close();
					})
			);
			modal.open();
		});
		return mismatchEl;
	}
}
