import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";

// TODO start work on this

export const JsWidget: CustomTypeWidget = {
	type: "js",
	icon: "braces",
	default: () => {
		{
		}
	},
	name: () => text("typeWidgets.js.name"),
	validate: (v) => typeof v === "object",
	render: (plugin, el, data, ctx) => {
		const {} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			"js"
		] ?? {
			...defaultPropertySettings["js"],
		};

		const container = el.createDiv({
			cls: "better-properties-js-container",
		});
		const { value } = data;
	},
};

export const createJsSettings = (
	el: HTMLElement,
	form: PropertySettings["js"],
	updateForm: <T extends keyof PropertySettings["js"]>(
		key: T,
		value: PropertySettings["js"][T]
	) => void
	// defaultOpen: boolean
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
