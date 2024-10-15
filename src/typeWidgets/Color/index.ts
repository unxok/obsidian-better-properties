import { ColorComponent } from "obsidian";
import { CustomTypeWidget } from "..";
import { text } from "@/i18Next";

export const ColorWidget: CustomTypeWidget = {
	type: "color",
	icon: "paintbrush",
	default: () => "#000000",
	name: () => text("typeWidgets.color.name"),
	validate: (v: unknown) => typeof v === "string",
	render: (_, el, data, ctx) => {
		const container = el
			.createDiv({
				cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "better-properties-flex-center better-properties-w-fit",
			});
		const { value } = data;
		new ColorComponent(container)
			.setValue(value?.toString() ?? "")
			.onChange((b) => {
				ctx.onChange(b);
			});
	},
};
