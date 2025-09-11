import { SliderComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { getPropertyTypeSettings, PropertyWidgetComponent } from "../utils";
import { typeKey } from ".";
import { clampNumber } from "~/lib/utils";

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

	const min = settings.min ?? 0;
	const max = settings.max ?? 100;
	const step = settings.step ?? 1;
	const clamp = (x: unknown) => clampNumber(Number(x), min, max);

	const value = clamp(initialValue);

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-slider",
	});

	container.createDiv({
		cls: "better-properties-slider-limit",
		text: min.toString(),
	});

	if (settings.hideLimits) {
		container.setAttribute("data-better-properties-slider-hide-limit", "true");
	}

	const slider = new SliderComponent(container)
		.setValue(value)
		.onChange((b) => {
			ctx.onChange(b);
		})
		.setLimits(min, max, step)
		.setDynamicTooltip();

	container.createDiv({
		cls: "better-properties-slider-limit",
		text: max.toString(),
	});

	return new PropertyWidgetComponent(
		typeKey,
		container,
		(v) => {
			slider.setValue(clamp(v));
		},
		() => {
			slider.sliderEl.focus();
		}
	);
};
