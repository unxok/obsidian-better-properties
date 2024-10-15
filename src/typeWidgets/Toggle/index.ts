import { ToggleComponent } from "obsidian";
import { CustomTypeWidget } from "..";
import { text } from "@/i18Next";

export const ToggleWidget: CustomTypeWidget = {
	type: "toggle",
	icon: "toggle-right",
	default: () => false,
	name: () => text("typeWidgets.toggle.name"),
	validate: (v) => typeof v === "boolean",
	render: (_plugin, el, data, ctx) => {
		const container = el
			.createDiv({
				cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "better-properties-flex-center better-properties-w-fit",
			});
		const { value } = data;
		new ToggleComponent(container).setValue(!!value).onChange((b) => {
			ctx.onChange(b);
		});
	},
};
