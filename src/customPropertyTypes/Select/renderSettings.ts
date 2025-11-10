import { typeKey } from ".";
import { CustomPropertyType } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import {
	renderDefaultSettings,
	renderDynamicSettings,
	renderFilesFromFileJsSetings,
	renderFilesFromFolderSettings,
	renderFilesFromInlineJsSettings,
	renderFilesFromTagSettings,
	renderManualSettings,
} from "./utils";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	plugin,
	modal,
	property,
}) => {
	const { tabContentEl: parentEl } = modal;
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

	renderDefaultSettings({
		plugin,
		parentEl,
		settings,
		modal,
		property,
	});

	if (settings.optionsType === "manual") {
		renderManualSettings({
			plugin,
			parentEl,
			settings,
		});
	}

	if (settings.optionsType === "dynamic") {
		if (!settings.dynamicOptionsType) {
			settings.dynamicOptionsType = "filesInFolder";
		}

		renderDynamicSettings({
			plugin,
			parentEl,
			settings,
			modal,
			property,
		});

		if (settings.dynamicOptionsType === "filesInFolder") {
			renderFilesFromFolderSettings({
				plugin,
				parentEl,
				settings,
			});
			return;
		}

		if (settings.dynamicOptionsType === "filesFromTag") {
			renderFilesFromTagSettings({
				plugin,
				parentEl,
				settings,
			});
			return;
		}

		if (settings.dynamicOptionsType === "filesFromInlineJs") {
			renderFilesFromInlineJsSettings({ plugin, parentEl, settings });
		}

		if (settings.dynamicOptionsType === "filesFromJsFile") {
			renderFilesFromFileJsSetings({ plugin, parentEl, settings });
		}
	}
};
