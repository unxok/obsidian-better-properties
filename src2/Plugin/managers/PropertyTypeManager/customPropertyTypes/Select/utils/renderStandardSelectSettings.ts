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
						"formula": "From a formula",
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

	if (settings.optionsType === "formula") {
		const settings = getSettings();
		new SettingGroup(containerEl).addSetting((s) => {
			s.setName("Formula")
				.setDesc(
					"The formula should return a list of strings or a list of lists which may have up to three strings corresponding to the value, label, and background of the option."
				)
				.addTextArea((textComponent) => {
					textComponent
						.setPlaceholder(
							`["apple", "orange", ["banana", "banana_label", "yellow"]]`
						)
						.setValue(settings.formula)
						.onChange(async (v) => {
							await updateSettings((prev) => ({ ...prev, formula: v }));
						});
				});
		});
	}
};
