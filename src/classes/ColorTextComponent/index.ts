import { ValueComponent, TextComponent, ColorComponent } from "obsidian";
import { obsidianText } from "~/i18next/obsidian";

export class ColorTextComponent extends ValueComponent<string> {
	private value: string = "";
	componentsContainerEl: HTMLElement;
	colorsContainerEl: HTMLElement;
	textComponent: TextComponent;
	colorComponent: ColorComponent;
	colorInputEl: HTMLDivElement;

	onChangeCallback: (value: string) => void = () => {};

	constructor(containerEl: HTMLElement) {
		super();

		this.componentsContainerEl = containerEl.createDiv({
			cls: "better-properties-color-text-component-container",
		});

		this.colorsContainerEl = this.componentsContainerEl.createDiv({
			cls: "better-properties-color-text-component-colors-container",
			attr: {
				// tabindex: "-1",
			},
		});

		this.colorComponent = new ColorComponent(this.colorsContainerEl);
		this.colorComponent.colorPickerEl.setAttribute("aria-hidden", "true");
		this.colorComponent.colorPickerEl.setAttribute("tabindex", "-1");
		this.colorInputEl = this.colorsContainerEl.createDiv({
			cls: "better-properties-swatch better-properties-color-text-component-color-input",
			attr: {
				tabindex: "0",
				role: "button",
			},
		});
		this.colorComponent.onChange((v) => {
			this.setColorCssVar(v);
			this.textComponent.inputEl.value = v;
			this.value = v;
			this.onChanged();
		});

		this.colorInputEl.addEventListener("click", () => {
			this.colorComponent.colorPickerEl.showPicker();
		});

		this.textComponent = new TextComponent(
			this.componentsContainerEl
		).setPlaceholder(obsidianText("properties.label-no-value"));
		this.textComponent.onChange((v) => {
			this.setColorCssVar(v);
			if (isHex(v)) {
				this.colorComponent.colorPickerEl.value = v;
			}
			this.value = v;
			this.onChanged();
		});
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): this {
		this.value = value;
		this.setColorCssVar(value);
		this.textComponent.inputEl.value = value;
		if (isHex(value)) {
			this.colorComponent.colorPickerEl.value = value;
		}
		return this;
	}

	onChanged() {
		this.onChangeCallback(this.getValue());
	}

	onChange(cb: (value: string) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	setColorCssVar(value: string) {
		this.colorsContainerEl.style.setProperty("--better-properties-bg", value);
	}
}

const isHex = (str: string) => {
	return str.startsWith("#") && str.length === 7;
};
