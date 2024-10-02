import { ButtonComponent } from "obsidian";
import { defaultPropertySettings } from "@/libs/utils/augmentMedataMenu/addSettings";
import { CustomTypeWidget } from "..";

export const ButtonWidget: CustomTypeWidget = {
	type: "button",
	icon: "plus-square",
	default: () => "new Notice('Hello there')",
	name: () => "Button",
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, data, ctx) => {
		const {
			displayText,
			icon,
			style,
			bgColor,
			textColor,
			callbackType,
			cssClass,
		} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			"button"
		] ?? {
			...defaultPropertySettings["button"],
		};

		const container = el.createDiv({
			cls: "metadata-input-longtext",
		});

		const btn = new ButtonComponent(container).setButtonText(displayText);

		btn.buttonEl.setAttribute("style", "margin-top: 0px;");

		if (style === "accent") btn.setCta();
		if (style === "warning") btn.setWarning();
		if (style === "destructive")
			btn.buttonEl.classList.add("mod-destructive");
		if (style === "ghost") btn.buttonEl.classList.add("clickable-icon");
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

		const value = data.value?.toString() ?? "";
		if (!value) return;

		btn.onClick(async () => {
			if (callbackType === "Command") {
				plugin.app.commands.executeCommandById(value);
				return;
			}

			const tryEval = async (str: string) => {
				try {
					const func = eval(`async (args) => {${str}}`);
					await func({ el, data, ctx });
				} catch (e) {
					new Notice(
						"Better Properties: Button callback failed. Check dev console for more details."
					);
					console.error(e);
				}
			};

			if (callbackType === "inlineJs") {
				await tryEval(value);
				return;
			}

			if (callbackType === "fileJs") {
				const file = plugin.app.vault.getFileByPath(value);
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
