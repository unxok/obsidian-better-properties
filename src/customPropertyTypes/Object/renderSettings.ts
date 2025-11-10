import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { typeKey } from "./renderWidget";
import { text } from "~/i18next";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl } = modal;

	const settings = getPropertyTypeSettings({
		plugin,
		property,
		type: typeKey,
	});

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property,
			type: typeKey,
			typeSettings: settings,
		});
	});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.object.settings.hideAddButton.title"))
		.setDesc(text("customPropertyTypes.object.settings.hideAddButton.desc"))
		.addToggle((cmp) => {
			cmp.setValue(!!settings.hideAddButton).onChange((b) => {
				settings.hideAddButton = b;
			});
		});
};
