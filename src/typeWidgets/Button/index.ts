import { ButtonComponent, DropdownComponent, Notice, Setting } from "obsidian";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { dangerousEval, getButtonStyledClass } from "@/libs/utils/pure";
import { IconSuggest } from "@/classes/IconSuggest";
import { TextColorComponent } from "@/classes/TextColorComponent";
import { createSection } from "@/libs/utils/setting";

import { CreatePropertySettings } from "@/PropertySettings";
import { text } from "@/i18Next";

const typeKey: CustomTypeWidget["type"] = "button";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "plus-square",
	default: () => "new Notice('Hello there')",
	name: () => text("typeWidgets.button.name"),
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, value, ctx) => {
		const {
			displayText,
			icon,
			style,
			bgColor,
			textColor,
			callbackType,
			cssClass,
		} = plugin.getPropertySetting(ctx.key)[typeKey];

		const container = el.createDiv({
			cls: "metadata-input-longtext",
		});

		const btn = new ButtonComponent(container).setButtonText(displayText);

		btn.buttonEl.setAttribute("style", "margin-top: 0px;");

		const className = getButtonStyledClass(style);
		if (className) {
			btn.buttonEl.classList.add(className);
		}
		if (bgColor) {
			btn.buttonEl.style.backgroundColor = bgColor;
		}
		if (textColor) {
			btn.buttonEl.style.color = textColor;
		}
		if (cssClass) {
			const arr = cssClass.split(" ");
			arr.forEach((cls) => btn.buttonEl.classList.add(cls));
		}
		if (icon) {
			btn.setIcon(icon);
		}

		const normalizeValue = value?.toString() ?? "";
		if (!value) return;

		btn.onClick(async () => {
			if (callbackType === "Command") {
				plugin.app.commands.executeCommandById(normalizeValue);
				return;
			}

			const tryEval = async (str: string) => {
				try {
					const func = dangerousEval(`async (args) => {${str}}`);
					await func({ el, value, ctx });
				} catch (e) {
					new Notice(
						"Better Properties: Button callback failed. Check dev console for more details."
					);
					console.error(e);
				}
			};

			if (callbackType === "inlineJs") {
				await tryEval(normalizeValue);
				return;
			}

			if (callbackType === "fileJs") {
				const file = plugin.app.vault.getFileByPath(normalizeValue);
				if (!file) {
					new Notice(
						"Better Properties: Button could find file from file path"
					);
					return;
				}
				const read = await plugin.app.vault.cachedRead(file);
				await tryEval(read);
			}
		});
	},
};

export const createSettings: CreatePropertySettings<typeof typeKey> = (
	el,
	form,
	updateForm,
	plugin
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
			cmp.setValue(displayText).onChange((v) => updateForm("displayText", v))
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
	let styleDropdown: DropdownComponent;
	let stylePreviewBtn: ButtonComponent;
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
					muted: "Muted",
				} as Record<typeof style, string>)
				.setValue(style)
				.then((cmp) => (styleDropdown = cmp))
		)
		.addButton((cmp) =>
			cmp
				.setButtonText("preview")
				.then((cmp) => {
					const cn = getButtonStyledClass(style);
					if (!cn) return;
					cmp.setClass(cn);
				})
				.then((cmp) => (stylePreviewBtn = cmp))
		);

	styleDropdown!.onChange((v) => {
		stylePreviewBtn.buttonEl.className = getButtonStyledClass(
			v as typeof style
		);
		updateForm("style", v as typeof style);
	});

	new Setting(content)
		.setName("Background color")
		.setDesc(
			"Specify a background color that will override one set by any CSS classes."
		)
		.then((cmp) =>
			new TextColorComponent(cmp.controlEl)
				.setValue(bgColor)
				.onChange((v) => updateForm("bgColor", v))
		);

	new Setting(content)
		.setName("Text color")
		.setDesc(
			"Specify a text color that will override one set by any CSS classes. This is unset by default."
		)
		.then((cmp) =>
			new TextColorComponent(cmp.controlEl)
				.setValue(textColor)
				.onChange((v) => updateForm("textColor", v))
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

export const Button: WidgetAndSettings = [widget, createSettings];
