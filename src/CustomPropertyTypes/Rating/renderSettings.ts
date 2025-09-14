import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { typeKey } from ".";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { IconSuggest } from "~/classes/InputSuggest/IconSuggest";

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
		.setName(text("customPropertyTypes.rating.settings.icon.title"))
		.setDesc(text("customPropertyTypes.rating.settings.icon.desc"))
		.addSearch((cmp) => {
			cmp.setValue(settings.icon ?? "").onChange((v) => {
				settings.icon = v || undefined;
			});
			new IconSuggest(plugin.app, cmp.inputEl).onSelect((v) => {
				cmp.setValue(v);
				cmp.onChanged();
			});
		});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.rating.settings.count.title"))
		.setDesc(text("customPropertyTypes.rating.settings.count.desc"))
		.addText((cmp) => {
			cmp.setValue(settings.count?.toString() ?? "").onChange((v) => {
				const n = Number(v);
				settings.count = !v || Number.isNaN(n) ? undefined : n;
			});
		});
};
