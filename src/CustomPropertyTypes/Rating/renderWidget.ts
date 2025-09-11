import { setIcon, ValueComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { Icon } from "~/lib/types/icons";
import { clampNumber } from "~/lib/utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new RatingTypeComponent(plugin, el, value, ctx);
};

class RatingTypeComponent extends PropertyWidgetComponentNew<"rating", number> {
	type = "rating" as const;
	parseValue = (v: unknown) => {
		const n = Number(v);
		return Number.isNaN(n) ? 0 : n;
	};

	rating: RatingComponent;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();
		const max = Math.max(1, settings.count ?? 5);
		const clamp = (x: unknown) => clampNumber(Number(x), 0, max);
		const parsed = clamp(this.parseValue(value));

		this.rating = new RatingComponent(el)
			.setIcon(settings.icon ?? "")
			.setMax(max)
			.setValue(parsed)
			.onChange((n) => {
				this.setValue(n);
			});

		this.rating.render();

		this.onFocus = () => {
			this.rating.checkboxEls[0]?.focus();
		};
	}

	getValue(): number {
		return this.rating.getValue();
	}

	setValue(value: unknown): void {
		if (this.rating.getValue() !== value) {
			this.rating.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}

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
		this.commitRating();
		return this;
	}

	getValue(): number {
		return this.value;
	}

	commitRating(): void {
		this.checkboxEls.forEach((el, i) => {
			const isChecked = i < this.getValue();
			if (isChecked) {
				el.setAttribute("aria-checked", "true");
				return;
			}
			el.removeAttribute("aria-checked");
		});
	}

	render(): void {
		this.inputContainer.empty();
		this.checkboxEls = [];
		for (let i = 0; i < this.max; i++) {
			const visualNumber = i + 1;
			const inputEl = this.inputContainer.createDiv({
				cls: "better-properties-rating-checkbox clickable-icon",
				attr: {
					"role": "checkbox",
					"tabindex": "0",
					"aria-label": visualNumber,
				},
			});
			setIcon(inputEl, this.icon);
			const onChange = () => {
				this.setValue(
					visualNumber === this.getValue() ? visualNumber - 1 : visualNumber
				);
				this.onChanged();
			};
			inputEl.addEventListener("click", onChange);
			inputEl.addEventListener("keydown", (e) => {
				if (e.key === " " || e.key === "Enter") {
					onChange();
					e.preventDefault();
				}
				if (e.key === "ArrowLeft") {
					this.checkboxEls[i - 1]?.focus();
					e.preventDefault();
				}
				if (e.key === "ArrowRight") {
					this.checkboxEls[i + 1]?.focus();
					e.preventDefault();
				}
				if (e.key === "ArrowUp") {
					this.checkboxEls[0]?.focus();
					e.preventDefault();
				}
				if (e.key === "ArrowDown") {
					this.checkboxEls[this.checkboxEls.length - 1]?.focus();
					e.preventDefault();
				}
				const n = Number(e.key);
				if (!Number.isNaN(n)) {
					this.setValue(n);
					e.preventDefault();
				}
			});
			this.checkboxEls.push(inputEl);
		}
		this.commitRating();
	}
}
