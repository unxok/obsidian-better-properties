import { ToggleComponent } from "obsidian";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { text } from "@/i18Next";
import { CreatePropertySettings } from "@/PropertySettings";

const typeKey: CustomTypeWidget["type"] = "toggle";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "toggle-right",
	default: () => false,
	name: () => text("typeWidgets.toggle.name"),
	validate: (v) => typeof v === "boolean",
	render: (_plugin, el, value, ctx) => {
		const container = el
			.createDiv({
				cls: "metadata-input-longtext",
			})
			.createDiv({
				cls: "better-properties-flex-center better-properties-w-fit",
			});
		new ToggleComponent(container).setValue(!!value).onChange((b) => {
			ctx.onChange(b);
		});
	},
};

const createSettings: CreatePropertySettings<typeof typeKey> = (el) => {
	el.createDiv({ text: "Nothing to see here... yet!" });
};

export const Toggle: WidgetAndSettings = [widget, createSettings];
