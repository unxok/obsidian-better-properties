import { Setting, SliderComponent } from "obsidian";
import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";

const typeKey: CustomTypeWidget["type"] = "slider";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "git-commit",
	default: () => 0,
	name: () => text("typeWidgets.slider.name"),
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const { min, max, step, showLabels } = plugin.getPropertySetting(data.key)[
			typeKey
		];
		const container = el
			.createDiv({
				// cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "better-properties-slider-container metadata-input-longtext",
			});
		const { value } = data;
		showLabels &&
			container.createSpan({
				text: min.toString(),
				cls: "better-properties-slider-label-start",
			});

		const inpContainer = container.createDiv({
			cls: "better-properties-slider-input-container",
		});
		new SliderComponent(inpContainer)
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

export const createSettings: CreatePropertySettings<typeof typeKey> = (
	el,
	form,
	updateForm
) => {
	const { content } = createSection(el, "Slider", true);

	new Setting(content)
		.setName(text("typeWidgets.slider.settings.minSetting.title"))
		.setDesc(text("typeWidgets.slider.settings.minSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.min.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("min", num);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.slider.settings.maxSetting.title"))
		.setDesc(text("typeWidgets.slider.settings.maxSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.max.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("max", num);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.slider.settings.stepSetting.title"))
		.setDesc(text("typeWidgets.slider.settings.stepSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.step.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("step", num);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.slider.settings.showLabelsSetting.title"))
		.setDesc(text("typeWidgets.slider.settings.showLabelsSetting.desc"))
		.addToggle((cmp) =>
			cmp.setValue(form.showLabels).onChange((b) => updateForm("showLabels", b))
		);
};

export const Slider: WidgetAndSettings = [widget, createSettings];
