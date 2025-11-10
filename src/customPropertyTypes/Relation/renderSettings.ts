import { CustomPropertyType } from "../types";
import { typeKey } from ".";
import {
	getPropertyTypeSettings,
	setPropertyTypeSettings,
	updatePropertyTypeSettings,
} from "../utils";
import { Setting } from "obsidian";
import { PropertySuggest } from "~/classes/InputSuggest/PropertySuggest";
import { customPropertyTypePrefix } from "~/lib/constants";

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

	const originalRelatedProperty = settings.relatedProperty;

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property: property,
			type: typeKey,
			typeSettings: { ...settings },
		});

		const { relatedProperty } = settings;
		if (relatedProperty === originalRelatedProperty) return;
		if (!relatedProperty && originalRelatedProperty) {
			updatePropertyTypeSettings({
				plugin,
				property: originalRelatedProperty,
				type: typeKey,
				cb: (prev) => ({ ...prev, relatedProperty: undefined }),
			});
		}
		if (!relatedProperty) return;

		plugin.app.metadataTypeManager.setType(
			relatedProperty,
			customPropertyTypePrefix + typeKey
		);
		updatePropertyTypeSettings({
			plugin,
			property: relatedProperty,
			type: typeKey,
			cb: (prev) => ({ ...prev, relatedProperty: property }),
		});
	});

	new Setting(tabContentEl)
		.setName("Related property")
		.setDesc("")
		.addSearch((cmp) => {
			cmp.setValue(settings.relatedProperty ?? "").onChange((v) => {
				settings.relatedProperty = v;
			});

			new PropertySuggest(plugin, cmp.inputEl).onSelect((v) => {
				cmp.setValue(v.name);
				cmp.onChanged();
			});
		});
};
