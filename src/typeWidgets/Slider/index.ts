import { SliderComponent, ToggleComponent } from "obsidian";
import { typeWidgetPrefix } from "src/lib/constants";
import PropertiesPlusPlus from "src/main";

const key = typeWidgetPrefix + "slider";
const name = "Slider";

export const registerSlider = (plugin: PropertiesPlusPlus) => {
	plugin.app.metadataTypeManager.registeredTypeWidgets[key] = {
		icon: "git-commit",
		default: () => 0,
		name: () => name,
		validate: (v) => !Number.isNaN(Number(v)),
		type: key,
		render: (el, data, ctx) => {
			const container = el
				.createDiv({
					cls: "metadata-input-longtext",
				})
				.createDiv({
					cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
				});
			const { value } = data;
			container.createSpan({
				text: "0",
				cls: "properties-plus-plus-slider-label-start",
			});
			new SliderComponent(container)
				.setValue(Number(value))
				.onChange((n) => {
					ctx.onChange(n);
				})
				.setInstant(false)
				.setDynamicTooltip()
				// .setLimits(-100, 100, 1)
				.showTooltip();

			container.createSpan({
				text: "100",
				cls: "properties-plus-plus-slider-label-end",
			});
		},
	};
};
