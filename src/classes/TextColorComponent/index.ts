// TRANSLATIONS done
import { ValueComponent, TextComponent, ColorComponent } from "obsidian";

export class TextColorComponent extends ValueComponent<string> {
	value: string = "";
	container: HTMLElement;
	textCmp: TextComponent;
	colorCmp: ColorComponent;
	constructor(container: HTMLElement) {
		super();
		this.container = container;

		const text = new TextComponent(container).onChange((v) => {
			this.setValue(v);
			this.onChanged();
		});
		const color = new ColorComponent(container).onChange((v) => {
			this.setValue(v);
			this.onChanged();
		});
		this.textCmp = text;
		this.colorCmp = color;
	}

	setValue(value: string): this {
		// this.textCmp.setValue(value);
		this.textCmp.inputEl.value = value;
		// this.colorCmp.setValue(value);
		this.colorCmp.colorPickerEl.value = value;
		this.value = value;
		return this;
	}

	getValue(): string {
		return this.value;
	}

	private onChangeCallback(_value: string): void {}

	onChange(cb: (value: string) => unknown): this {
		this.onChangeCallback = cb;
		return this;
	}

	onChanged(): this {
		this.onChangeCallback(this.value);
		return this;
	}
}
