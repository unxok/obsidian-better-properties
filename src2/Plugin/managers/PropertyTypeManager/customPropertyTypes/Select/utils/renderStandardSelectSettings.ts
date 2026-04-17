import { BetterProperties } from "#/Plugin";
import { SettingGroup } from "obsidian";
import { renderBaseSettings } from "./renderBaseSettings";
import { renderManualSettings } from "./renderManualSettings";
import { StandardSelectSettings } from "./types";
import { t } from "#/i18n";

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
			.setName(t("select.settings.optionsTypeName"))
			.setDesc(t("select.settings.optionsTypeDesc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						"manual": t("select.settings.optionsTypeLabels.manual"),
						"base-file": t("select.settings.optionsTypeLabels.base-file"),
						"inline-base": t("select.settings.optionsTypeLabels.inline-base"),
						"formula": t("select.settings.optionsTypeLabels.formula"),
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
			s.setName(t("select.settings.formulaName"))
				.setDesc(t("select.settings.formulaDesc"))
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
