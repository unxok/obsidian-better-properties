import { SliderComponent } from "obsidian";
import { typeKeySuffixes, typeWidgetPrefix } from "@/libs/constants";
import { defaultPropertySettings } from "@/libs/utils/augmentMedataMenu/addSettings";
import PropertiesPlusPlus from "@/main";

const shortTypeKey = typeKeySuffixes.slider;
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = "Slider";

export const registerSlider = (plugin: PropertiesPlusPlus) => {
	plugin.app.metadataTypeManager.registeredTypeWidgets[fullTypeKey] = {
		icon: "git-commit",
		default: () => 0,
		name: () => name,
		validate: (v) => !Number.isNaN(Number(v)),
		type: fullTypeKey,
		render: (el, data, ctx) => {
			const { min, max, step, showLabels } = plugin.settings
				.propertySettings[data.key.toLowerCase()]?.[shortTypeKey] ?? {
				...defaultPropertySettings[shortTypeKey],
			};
			const container = el
				.createDiv({
					cls: "metadata-input-longtext",
				})
				.createDiv({
					cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
				});
			const { value } = data;
			showLabels &&
				container.createSpan({
					text: min.toString(),
					cls: "properties-plus-plus-slider-label-start",
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
					cls: "properties-plus-plus-slider-label-end",
				});
		},
	};
};
