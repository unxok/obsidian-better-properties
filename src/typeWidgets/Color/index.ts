import { ColorComponent } from "obsidian";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { text } from "@/i18Next";
import { CreatePropertySettings } from "@/PropertySettings";

const typeKey: CustomTypeWidget["type"] = "color";

export const widget: CustomTypeWidget = {
	type: typeKey,
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

const createSettings: CreatePropertySettings<typeof typeKey> = (el) => {
	el.createDiv({ text: "Nothing to see here... yet!" });
};

export const Color: WidgetAndSettings = [widget, createSettings];
