import { moment, Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { typeKey } from ".";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { IconSuggest } from "~/Classes/InputSuggest/IconSuggest";
import { obsidianText } from "~/i18next/obsidian";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl } = modal;

	const settings = getPropertyTypeSettings({
		plugin,
		property: property,
		type: typeKey,
	});

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property: property,
			type: typeKey,
			typeSettings: { ...settings },
		});
	});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.datecustom.settings.type.title"))
		.setDesc(text("customPropertyTypes.datecustom.settings.type.desc"))
		.addDropdown((cmp) => {
			cmp
				.addOptions({
					"date": text("datetime.date"),
					"datetime-local": text("datetime.dateAndTime"),
				} satisfies Record<NonNullable<(typeof settings)["type"]>, string>)
				.setValue(settings.type ?? "date")
				.onChange((v) => {
					settings.type = v as NonNullable<(typeof settings)["type"]>;
				});
		});

	let renderFormatPreview = () => {};
	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.datecustom.settings.format.title"))
		.setDesc(
			createFragment((el) => {
				el.appendText(
					text("customPropertyTypes.datecustom.settings.format.desc")
				);
				el.appendText(" ");
				el.createEl("a", {
					text: obsidianText("plugins.daily-notes.label-syntax-link"),
					href: "https://momentjs.com/docs/#/displaying/format/",
					attr: {
						target: "_blank",
						rel: "noopener",
					},
				});
				el.createEl("br");
				el.appendText(
					obsidianText("plugins.daily-notes.label-syntax-live-preview")
				);
				const formatPreviewEl = el.createEl("b", {
					cls: "u-pop",
				});
				renderFormatPreview = () => {
					const formatted = moment().format(settings.format ?? "YYYY-MM-DD");
					formatPreviewEl.textContent = formatted;
				};
				renderFormatPreview();
			})
		)
		.addText((cmp) => {
			cmp
				.setPlaceholder("YYYY-MM-DD")
				.setValue(settings.format ?? "")
				.onChange((v) => {
					settings.format = v || undefined;
					renderFormatPreview();
				});
		});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.datecustom.settings.placeholder.title"))
		.setDesc(text("customPropertyTypes.datecustom.settings.placeholder.desc"))
		.addText((cmp) => {
			cmp
				.setPlaceholder(obsidianText("interface.empty-state.empty"))
				.setValue(settings.placeholder ?? "")
				.onChange((v) => {
					settings.placeholder = v || undefined;
				});
		});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.datecustom.settings.icon.title"))
		.setDesc(text("customPropertyTypes.datecustom.settings.icon.desc"))
		.addSearch((cmp) => {
			cmp.setValue(settings.icon ?? "").onChange((v) => {
				settings.icon = v || undefined;
			});
			new IconSuggest(plugin.app, cmp.inputEl).onSelect((v) => {
				cmp.setValue(v);
				cmp.onChanged();
			});
		});
};
