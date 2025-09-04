import { Setting, moment } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { obsidianText } from "~/i18next/obsidian";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl } = modal;

	const settings = getPropertyTypeSettings({
		plugin,
		property,
		type: "created",
	});

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property,
			type: "created",
			typeSettings: settings,
		});
	});

	let updateFormatSample = (_: string): void => {
		throw new Error("Not implemented");
	};

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.created.settings.format.title"))
		.setDesc(
			createFragment((el) => {
				el.appendText(
					text("customPropertyTypes.created.settings.format.desc") + " "
				);
				el.createEl("a", {
					text: obsidianText("plugins.daily-notes.label-syntax-link"),
					href: "https://momentjs.com/docs/#/displaying/format/",
				});

				el.createEl("br");

				el.appendText(
					obsidianText("plugins.daily-notes.label-syntax-live-preview") + " "
				);
				const formatSampleEl = el.createEl("b", { cls: "u-pop" });
				updateFormatSample = (formatStr) => {
					const dateStr = formatStr === "" ? "" : moment().format(formatStr);
					formatSampleEl.textContent = dateStr;
				};
			})
		)
		.addText((cmp) => {
			cmp
				.setPlaceholder("YYYY-MM-DD")
				.setValue(settings.format ?? "")
				.onChange((v) => {
					updateFormatSample(v);
					settings.format = v;
				});
		});
};
