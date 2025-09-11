import { SliderComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { clampNumber } from "~/lib/utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new SliderTypeComponent(plugin, el, value, ctx);
};

class SliderTypeComponent extends PropertyWidgetComponentNew<"slider", number> {
	type = "slider" as const;
	parseValue = (v: unknown) => {
		const n = Number(v);
		return Number.isNaN(n) ? 0 : n;
	};

	slider: SliderComponent;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();
		const min = settings.min ?? 0;
		const max = settings.max ?? 100;
		const step = settings.step ?? 1;
		const clamp = (x: unknown) => clampNumber(Number(x), min, max);

		const parsed = clamp(this.parseValue(value));

		const container = el.createDiv({
			cls: "better-properties-slider-container",
			attr: {
				"data-better-properties-slider-hide-limit": settings.hideLimits ?? null,
			},
		});

		container.createDiv({
			cls: "better-properties-slider-limit",
			text: min.toString(),
		});

		this.slider = new SliderComponent(container)
			.setValue(parsed)
			.onChange((v) => {
				this.setValue(v);
			})
			.setLimits(min, max, step)
			.setDynamicTooltip();

		container.createDiv({
			cls: "better-properties-slider-limit",
			text: max.toString(),
		});

		this.onFocus = () => {
			this.slider.sliderEl.focus();
		};
	}

	getValue(): number {
		return this.slider.getValue();
	}

	setValue(value: unknown): void {
		if (this.slider.getValue() !== value) {
			this.slider.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}
