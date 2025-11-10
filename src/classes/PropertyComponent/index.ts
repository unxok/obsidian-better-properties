import {
	ValueComponent,
	stringifyYaml,
	Menu,
	setIcon,
	displayTooltip,
} from "obsidian";
import {
	TypeInfo,
	PropertyWidget,
	PropertyWidgetComponentBase,
} from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { ConfirmationModal } from "../ConfirmationModal";
import { EventWithTarget } from "~/lib/utils";

export class PropertyComponent extends ValueComponent<unknown> {
	propertyEl: HTMLDivElement | undefined;
	keyEl: HTMLDivElement | undefined;
	iconEl: HTMLSpanElement | undefined;
	keyInputEl: HTMLInputElement | undefined;
	valueEl: HTMLDivElement | undefined;
	mismatchEl: HTMLDivElement | undefined;
	rendered: PropertyWidgetComponentBase | undefined;

	keyWithoutDots: string;
	oldKey: string;
	oldKeyWithoutDots: string;

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
		this.keyWithoutDots = this.setKey(key);
		this.oldKey = key;
		this.oldKeyWithoutDots = this.keyWithoutDots;
	}

	setKey(newKey: string): string {
		this.key = newKey;
		this.keyWithoutDots = newKey.split(".").reverse()[0];
		return this.keyWithoutDots;
	}

	render(focus?: boolean): PropertyWidgetComponentBase {
		this.propertyEl = this.createPropertyEl();
		this.keyEl = this.createKeyEl(this.propertyEl);
		this.iconEl = this.createIconEl(this.keyEl);
		this.keyInputEl = this.createKeyInputEl(this.keyEl);
		this.valueEl = this.createValueEl(this.propertyEl);
		this.mismatchEl = this.createMismatchEl(this.propertyEl, this.valueEl);
		this.rendered = this.renderWidget(
			this.valueEl,
			this.getTypeInfo().inferred
		);
		if (focus) {
			this.rendered.focus();
		}
		return this.rendered;
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
		const el = this.containerEl.createDiv({
			cls: "metadata-property",
			attr: {
				"tabindex": "0",
				"data-property-key": this.key,
			},
		});

		return el;
	}

	createKeyEl(propertyEl: HTMLElement): HTMLDivElement {
		return propertyEl.createDiv({ cls: "metadata-property-key" });
	}

	createIconEl(keyEl: HTMLDivElement): HTMLSpanElement {
		const iconEl = keyEl.createSpan({ cls: "metadata-property-icon" });
		setIcon(iconEl, this.getTypeInfo().expected.icon);

		iconEl.addEventListener("click", (e) => {
			const menu = new Menu();
			menu.addSections(["", "action", "clipboard", "danger"]);
			menu
				.addItem((item) => {
					item
						// .setSection("")
						.setTitle(obsidianText("properties.option-property-type"))
						.setIcon("lucide-info" satisfies Icon);
					const sub = item.setSubmenu();
					const { metadataTypeManager } = this.plugin.app;
					const assignedType = metadataTypeManager.getAssignedWidget(this.key);
					const widgets = Object.values(
						metadataTypeManager.registeredTypeWidgets
					);
					const isAssignedReserved = widgets.some((w) =>
						w.reservedKeys?.includes(this.key)
					);
					widgets.forEach((widget) => {
						const isSelected = widget.type === assignedType;
						const isReserved = !!widget.reservedKeys;
						if (!isSelected && isReserved) return;
						sub.addItem((item) =>
							item
								.setTitle(widget.name())
								.setIcon(widget.icon)
								.onClick(() => {
									metadataTypeManager.setType(this.key, widget.type);
								})
								.setDisabled(isAssignedReserved)
						);
					});
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

	async onKeyChange(
		key: string,
		e: EventWithTarget<HTMLInputElement>
	): Promise<void> {
		// gets rid of TS warning
		key;
		e;
		throw new Error("Method not implemented");
	}

	handleKeyChange(e: EventWithTarget<HTMLInputElement>): void {
		const newKey = e.target?.value ?? "";

		// // key made empty, remove its UI
		// if (newKey === "") {
		// 	this.remove();
		// }

		// // key is not changed, so do nothing
		// if (newKey === this.keyWithoutDots) {
		// 	return;
		// }

		// key is changed
		this.onKeyChange(newKey, e);
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

		let skipOnBlur: boolean = false;

		const handleTabOrEnter = (e: EventWithTarget<HTMLInputElement>) => {
			skipOnBlur = true;
			if (keyInputEl.value === "") {
				displayTooltip(
					keyInputEl,
					obsidianText("properties.msg-empty-property-name"),
					{ classes: ["mod-error"] }
				);
				return;
			}
			this.rendered?.focus();
			this.handleKeyChange(e as EventWithTarget<HTMLInputElement>);
		};

		keyInputEl.addEventListener("keydown", (e) => {
			if (e.key !== "Tab") return;
			e.preventDefault();
			handleTabOrEnter(e as EventWithTarget<HTMLInputElement>);
		});

		keyInputEl.addEventListener("keyup", (e) => {
			if (e.key !== "Enter") return;
			handleTabOrEnter(e as EventWithTarget<HTMLInputElement>);
		});

		keyInputEl.addEventListener("blur", (e) => {
			if (skipOnBlur) {
				skipOnBlur = false;
				return;
			}
			if (keyInputEl.value === "") {
				this.remove();
				return;
			}

			this.handleKeyChange(e as EventWithTarget<HTMLInputElement>);
		});

		const updateIconDisable = () => {
			if (!this.iconEl) return;
			const isEmpty = keyInputEl.value === "";
			isEmpty
				? this.iconEl.setAttribute("disabled", "true")
				: this.iconEl.removeAttribute("disabled");
		};

		updateIconDisable();
		keyInputEl.addEventListener("keydown", () => updateIconDisable());

		return keyInputEl;
	}

	createValueEl(propertyEl: HTMLDivElement): HTMLDivElement {
		const el = propertyEl.createDiv({
			cls: "metadata-property-value",
		});

		// el.addEventListener("keydown", (e) => {
		// 	if (e.key !== "Enter") return;
		// 	if (!(e.target instanceof HTMLElement)) return;
		// 	e.target.isActiveElement() ? e.target.blur() : this.rendered?.focus();
		// });

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
			mismatchEl.classList.add("better-properties-mod-hidden");
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
