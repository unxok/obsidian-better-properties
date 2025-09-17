import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { typeKey } from ".";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";

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
		.setName(text("customPropertyTypes.numeric.settings.decimalPlaces.title"))
		.setDesc(text("customPropertyTypes.numeric.settings.decimalPlaces.desc"))
		.addText((cmp) => {
			cmp.inputEl.type = "number";
			cmp.setValue(settings.decimalPlaces?.toString() ?? "");
			cmp.onChange((v) => {
				settings.decimalPlaces = Number(v);
			});
		});
};
