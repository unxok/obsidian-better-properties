import { Setting, SliderComponent } from "obsidian";
import {
	defaultPropertySettings,
	PropertySettings,
} from "@/libs/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";

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
			.setLimits(min, max, step);

		showLabels &&
			container.createSpan({
				text: max.toString(),
				cls: "better-properties-slider-label-end",
			});
	},
};

export const createSliderSettings = (
	el: HTMLElement,
	form: PropertySettings["slider"],
	updateForm: <T extends keyof PropertySettings["slider"]>(
		key: T,
		value: PropertySettings["slider"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Slider", true);

	new Setting(content)
		.setName("Min")
		.setDesc("The minimum value the slider can reach.")
		.addText((cmp) =>
			cmp.setValue(form.min.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("min", num);
			})
		);

	new Setting(content)
		.setName("Max")
		.setDesc("The maximum value the slider can reach.")
		.addText((cmp) =>
			cmp.setValue(form.max.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("max", num);
			})
		);

	new Setting(content)
		.setName("Step")
		.setDesc("The smallest amount that the slider can be changed.")
		.addText((cmp) =>
			cmp.setValue(form.step.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("step", num);
			})
		);

	new Setting(content)
		.setName("Show labels")
		.setDesc("If on, labels for the min & max will be shown.")
		.addToggle((cmp) =>
			cmp
				.setValue(form.showLabels)
				.onChange((b) => updateForm("showLabels", b))
		);
};
