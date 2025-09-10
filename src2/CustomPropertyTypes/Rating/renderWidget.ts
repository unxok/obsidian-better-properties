import { setIcon, ValueComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	getPropertyTypeSettings,
	// getPropertyTypeSettings,
	PropertyWidgetComponent,
} from "../utils";
import { Icon } from "~/lib/types/icons";
import { clampNumber } from "~/lib/utils";
import { typeKey } from ".";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	const settings = getPropertyTypeSettings({
		plugin,
		property: ctx.key,
		type: typeKey,
	});

	// const setSettings = (typeSettings: PropertySettings[T]) => {
	// 	setPropertyTypeSettings({
	// 		plugin,
	// 		property: ctx.key,
	// 		type: typeKey,
	// 		typeSettings,
	// 	});
	// };

	const max = Math.max(1, settings.count ?? 5);
	const clamp = (x: unknown) => clampNumber(Number(x), 0, max);

	const value = clamp(initialValue);

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-rating",
	});

	const toggle = new RatingComponent(container)
		.setIcon(settings.icon ?? "")
		.setMax(max)
		.setValue(value)
		.onChange((b) => {
			ctx.onChange(b);
		});

	toggle.render();

	return new PropertyWidgetComponent(
		"toggle",
		container,
		(v) => {
			toggle.setValue(clamp(v));
		},
		() => {
			toggle.checkboxEls[0]?.focus();
		}
	);
};

class RatingComponent extends ValueComponent<number> {
	max: number = 5;
	value: number = 0;
	icon: Icon | (string & {}) = "lucide-star";
	inputContainer: HTMLDivElement;
	onChangeCallback: (v: number) => void = () => {};

	checkboxEls: HTMLDivElement[] = [];

	constructor(public containerEl: HTMLElement) {
		super();
		this.inputContainer = containerEl.createDiv({
			cls: "better-properties-rating-container",
			attr: {
				role: "group",
			},
		});
	}

	setMax(n: number): this {
		this.max = Math.max(0, n);
		return this;
	}

	setIcon(icon: string): this {
		if (!icon) {
			this.icon = "lucide-star";
			return this;
		}
		this.icon = icon;
		return this;
	}

	onChange(cb: (value: number) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	onChanged(): void {
		this.onChangeCallback(this.getValue());
	}

	setValue(value: number): this {
		this.value = value;
		return this;
	}

	getValue(): number {
		return this.value;
	}

	render(): void {
		this.inputContainer.empty();
		this.checkboxEls = [];
		for (let i = 0; i < this.max; i++) {
			const visualNumber = i + 1;
			const isChecked = i < this.getValue();
			const inputEl = this.inputContainer.createDiv({
				cls: "better-properties-rating-checkbox clickable-icon",
				attr: {
					"role": "checkbox",
					"tabindex": "0",
					"aria-checked": isChecked,
					"aria-label": visualNumber,
				},
			});
			setIcon(inputEl, this.icon);
			inputEl.addEventListener("click", () => {
				this.setValue(
					visualNumber === this.getValue() ? visualNumber - 1 : visualNumber
				);
				this.render();
				this.onChanged();
			});
			this.checkboxEls.push(inputEl);
		}
	}
}
