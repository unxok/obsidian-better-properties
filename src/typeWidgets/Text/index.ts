import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { obsidianText } from "@/i18Next/defaultObsidian";

export const TextWidget: CustomTypeWidget = {
	type: "text",
	icon: "braces",
	default: () => {
		{
		}
	},
	name: () => obsidianText("properties.types.option-text"),
	validate: (v) => typeof v === "object",
	render: (plugin, el, data, ctx) => {
		const {} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			"text"
		] ?? {
			...defaultPropertySettings["text"],
		};

		const container = el.createDiv({
			cls: "better-properties-text-container",
		});
		const { value } = data;
	},
};

export const createJsSettings = (
	el: HTMLElement,
	form: PropertySettings["text"],
	updateForm: <T extends keyof PropertySettings["text"]>(
		key: T,
		value: PropertySettings["text"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Group", true);

	// new Setting(content)
	// 	.setName(text("typeWidgets.text.settings.headerTextSetting.title"))
	// 	.setDesc(text("typeWidgets.text.settings.headerTextSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.headerText).onChange((v) => {
	// 			updateForm("headerText", v);
	// 		})
	// 	);
};
