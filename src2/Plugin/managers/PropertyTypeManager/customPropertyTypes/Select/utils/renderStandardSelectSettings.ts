import { BetterProperties } from "#/Plugin";
import { SettingGroup } from "obsidian";
import { renderBaseSettings } from "./renderBaseSettings";
import { renderManualSettings } from "./renderManualSettings";
import { StandardSelectSettings } from "./types";

/**
 * Renders the standard settings for a Select (which are used by Multi-Select as well)
 */
export const renderStandardSelectSettings = ({
	plugin,
	containerEl,
	getSettings,
	updateSettings,
	reRenderModal,
}: {
	plugin: BetterProperties;
	containerEl: HTMLElement;
	getSettings: () => StandardSelectSettings;
	updateSettings: (
		cb: (s: StandardSelectSettings) => StandardSelectSettings
	) => Promise<void>;
	reRenderModal: () => void;
}) => {
	const settings = getSettings();

	new SettingGroup(containerEl).addSetting((setting) => {
		setting
			.setName("Options type")
			.setDesc("How the available options should be determined.")
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						"manual": "Manually defined",
						"base-file": "From a .base file",
						"inline-base": "From an inline base",
					} satisfies Record<StandardSelectSettings["optionsType"], string>)
					.setValue(settings.optionsType)
					.onChange(async (v) => {
						await updateSettings((s) => ({
							...s,
							optionsType: v as StandardSelectSettings["optionsType"],
						}));
						reRenderModal();
					});
			});
	});

	if (settings.optionsType === "manual") {
		renderManualSettings({
			plugin,
			containerEl,
			settings,
			updateSettings,
			reRenderModal,
		});
	}

	if (
		settings.optionsType === "inline-base" ||
		settings.optionsType === "base-file"
	) {
		renderBaseSettings({
			plugin,
			containerEl,
			getSettings,
			updateSettings,
			reRenderModal,
		});
	}
};
