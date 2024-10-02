import BetterProperties from "@/main";
import { PropertySettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { ColorComponent, Setting } from "obsidian";
import { IconSuggest } from "@/classes/IconSuggest";

export const createButtonSettings = (
	el: HTMLElement,
	form: PropertySettings["button"],
	updateForm: <T extends keyof PropertySettings["button"]>(
		key: T,
		value: PropertySettings["button"][T]
	) => void,
	plugin: BetterProperties
	// defaultOpen: boolean
) => {
	const {
		displayText,
		icon,
		style,
		bgColor,
		textColor,
		cssClass,
		callbackType,
	} = form;

	const { content } = createSection(el, "Button", true);

	new Setting(content)
		.setName("Display text")
		.setDesc("The text that will show within the button.")
		.addText((cmp) =>
			cmp
				.setValue(displayText)
				.onChange((v) => updateForm("displayText", v))
		);

	new Setting(content)
		.setName("Icon")
		.setDesc(
			"Set an icon for the button. This will remove the display text from showing."
		)
		.addText((cmp) =>
			cmp
				.setValue(icon)
				.onChange((v) => updateForm("icon", v))
				.then((cmp) => new IconSuggest(plugin.app, cmp))
		);
	new Setting(content)
		.setName("Callback type")
		.setDesc(
			"Select the option that the button will use to determine how to run it's value."
		)
		.addDropdown((cmp) =>
			cmp
				.addOptions({
					Command: "Command",
					inlineJs: "Inline JavaScript",
					fileJs: "JavaScript File",
				} as Record<typeof callbackType, string>)
				.setValue(callbackType)
		);
	new Setting(content)
		.setName("Button style")
		.setDesc("Basic styling for the button.")
		.addDropdown((cmp) =>
			cmp
				.addOptions({
					default: "Default",
					accent: "Accent",
					warning: "Warning",
					destructive: "Destructive",
					ghost: "Ghost",
				} as Record<typeof style, string>)
				.setValue(style)
				.onChange((v) => updateForm("style", v as typeof style))
		);
	let bgColorCmp: ColorComponent;
	new Setting(content)
		.setName("Background color")
		.setDesc(
			"Specify a background color that will override one set by any CSS classes. This is unset by default."
		)
		.addExtraButton((cmp) =>
			cmp
				.setTooltip("Remove color")
				.setIcon("rotate-ccw")
				.onClick(() => {
					updateForm("bgColor", "");
					bgColorCmp.colorPickerEl.value = "";
				})
		)
		.addColorPicker((cmp) =>
			cmp
				.setValue(bgColor)
				.onChange((v) => updateForm("bgColor", v))
				.then((cmp) => (bgColorCmp = cmp))
		);
	let textColorCmp: ColorComponent;
	new Setting(content)
		.setName("Text color")
		.setDesc(
			"Specify a text color that will override one set by any CSS classes. This is unset by default."
		)
		.addExtraButton((cmp) =>
			cmp
				.setTooltip("Remove color")
				.setIcon("rotate-ccw")
				.onClick(() => {
					updateForm("textColor", "");
					textColorCmp.colorPickerEl.value = "";
				})
		)
		.addColorPicker((cmp) =>
			cmp
				.setValue(textColor)
				.onChange((v) => updateForm("textColor", v))
				.then((cmp) => (textColorCmp = cmp))
		);
	new Setting(content)
		.setName("CSS Classes")
		.setDesc(
			"Enter a space-separated list of CSS class names to add to the button element."
		)
		.addText((cmp) =>
			cmp
				.setPlaceholder("cls-1 cls-2")
				.setValue(cssClass)
				.onChange((v) => updateForm("cssClass", v))
		);
};
