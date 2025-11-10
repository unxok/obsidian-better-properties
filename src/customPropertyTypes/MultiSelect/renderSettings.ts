import { Setting } from "obsidian";
import { typeKey } from ".";
import {
	renderDynamicSettings,
	renderFilesFromFileJsSetings,
	renderFilesFromFolderSettings,
	renderFilesFromInlineJsSettings,
	renderFilesFromTagSettings,
	renderManualSettings,
	SelectOptionsType,
} from "./utils";
import { CustomPropertyType } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { text } from "~/i18next";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl: parentEl } = modal;

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

	new Setting(parentEl)
		.setName(text("customPropertyTypes.select.settings.optionsType.title"))
		.setDesc(text("customPropertyTypes.select.settings.optionsType.desc"))
		.addDropdown((dropdown) => {
			dropdown
				.addOptions({
					manual: text(
						"customPropertyTypes.select.settings.optionsType.selectLabelManual"
					),
					dynamic: text(
						"customPropertyTypes.select.settings.optionsType.selectLabelDynamic"
					),
				} satisfies Record<Exclude<SelectOptionsType, undefined>, string>)
				.setValue(
					settings?.optionsType ?? ("manual" satisfies SelectOptionsType)
				)
				.onChange((v) => {
					const opt = v as SelectOptionsType;
					// optionsTypeSettings.showGroup(opt);
					settings.optionsType = opt;
					parentEl.empty();
					renderSettings({ plugin, modal, property });
				});
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
