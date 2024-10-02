import { ToggleComponent } from "obsidian";
import { CustomTypeWidget } from "..";

export const ToggleWidget: CustomTypeWidget = {
	type: "toggle",
	icon: "toggle-right",
	default: () => false,
	name: () => "Toggle",
	validate: (v) => typeof v === "boolean",
	render: (plugin, el, data, ctx) => {
		const container = el
			.createDiv({
				cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
			});
		const { value } = data;
		new ToggleComponent(container).setValue(!!value).onChange((b) => {
			ctx.onChange(b);
		});
	},
};
