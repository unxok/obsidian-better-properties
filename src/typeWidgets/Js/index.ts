import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";

// TODO start work on this

const typeKey: CustomTypeWidget["type"] = "js";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "braces",
	default: () => {
		{
		}
	},
	name: () => text("typeWidgets.js.name"),
	validate: (v) => typeof v === "object",
	render: (plugin, el, data, ctx) => {
		const {} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			typeKey
		] ?? {
			...defaultPropertySettings[typeKey],
		};

		const container = el.createDiv({
			cls: "better-properties-js-container",
		});
		const { value } = data;
	},
};

export const createSettings: CreatePropertySettings<typeof typeKey> = (
	el,
	form,
	updateForm
) => {
	const { content } = createSection(el, "Group", true);

	// new Setting(content)
	// 	.setName(text("typeWidgets.js.settings.headerTextSetting.title"))
	// 	.setDesc(text("typeWidgets.js.settings.headerTextSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.headerText).onChange((v) => {
	// 			updateForm("headerText", v);
	// 		})
	// 	);
};

export const Js: WidgetAndSettings = [widget, createSettings];
