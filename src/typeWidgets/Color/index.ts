import { ColorComponent } from "obsidian";
import { CustomTypeWidget } from "..";

export const ColorWidget: CustomTypeWidget = {
	type: "color",
	icon: "paintbrush",
	default: () => "#000000",
	name: () => "Color",
	validate: (v: unknown) => typeof v === "string",
	render: (_, el, data, ctx) => {
		const container = el
			.createDiv({
				cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
			});
		const { value } = data;
		new ColorComponent(container)
			.setValue(value?.toString() ?? "")
			.onChange((b) => {
				ctx.onChange(b);
			});
	},
};
