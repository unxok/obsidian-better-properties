import { SliderComponent } from "obsidian";
import { defaultPropertySettings } from "@/libs/utils/augmentMedataMenu/addSettings";
import { CustomTypeWidget } from "..";

export const SliderWidget: CustomTypeWidget = {
	type: "slider",
	icon: "git-commit",
	default: () => 0,
	name: () => "Slider",
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const { min, max, step, showLabels } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.["slider"] ?? {
			...defaultPropertySettings["slider"],
		};
		const container = el
			.createDiv({
				cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "better-properties-flex-center better-properties-w-fit",
			});
		const { value } = data;
		showLabels &&
			container.createSpan({
				text: min.toString(),
				cls: "better-properties-slider-label-start",
			});
		new SliderComponent(container)
			.setValue(Number(value))
			.onChange((n) => {
				ctx.onChange(n);
			})
			.setInstant(false)
			.setDynamicTooltip()
			.setLimits(min, max, step)
			.showTooltip();

		showLabels &&
			container.createSpan({
				text: max.toString(),
				cls: "better-properties-slider-label-end",
			});
	},
};
