import { BetterProperties } from "#/Plugin";
import { SettingGroup, TFile } from "obsidian";
import { InputSuggest, Suggestion } from "~/classes/InputSuggest";
import { StandardSelectSettings } from "./types";
import { t } from "#/i18n";
import { obsidianText } from "~/i18next/obsidian";

/**
 * Renders settings for a Select with `optionType` set to `"inline-base"` or `"base-file"`
 */
export const renderBaseSettings = ({
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
	const baseSettingGroup = new SettingGroup(containerEl);

	if (settings.optionsType === "inline-base") {
		baseSettingGroup.addSetting((s) => {
			s.setName(t("select.settings.baseConfigName"))
				.setDesc(t("select.settings.baseConfigDesc"))
				.addButton((button) => {
					button
						.setButtonText(obsidianText("interface.menu.edit"))
						.onClick(async () => {
							await plugin.baseUtilityManager.openBaseEditorModal({
								query: settings.inlineBase,
								onClose: async ({ embedComponent }) => {
									const query =
										embedComponent.controller.query?.toString() ?? "";
									await updateSettings((prev) => ({
										...prev,
										inlineBase: query,
									}));
									reRenderModal();
								},
							});
						});
				});
		});
	}

	if (settings.optionsType === "base-file") {
		baseSettingGroup.addSetting((s) => {
			s.setName(t("select.settings.baseFileName"))
				.setDesc(t("select.settings.baseFileDesc"))
				.addSearch((search) => {
					search.setValue(settings.baseFile).onChange(async (v) => {
						await updateSettings((prev) => ({ ...prev, baseFile: v }));
					});
					new BasePathSuggest(plugin.app, search.inputEl).onSelect((f) => {
						search.setValue(f.path);
						search.onChanged();
					});
				});
		});
	}

	baseSettingGroup
		.addSetting((s) => {
			s.setName(t("select.settings.baseLabelColName"))
				.setDesc(t("select.settings.baseLabelColDesc"))
				.addSearch((search) => {
					search.setValue(settings.baseLabelColumn).onChange(async (v) => {
						await updateSettings((prev) => ({ ...prev, baseLabelColumn: v }));

						new ColumnSuggest(plugin, search.inputEl, getSettings).onSelect(
							(v) => {
								search.setValue(v);
								search.onChanged();
							}
						);
					});
				});
		})
		.addSetting((s) => {
			s.setName(t("select.settings.baseBackgroundColName"))
				.setDesc(t("select.settings.baseBackgroundColDesc"))
				.addSearch((search) => {
					search.setValue(settings.baseBackgroundColumn).onChange(async (v) => {
						await updateSettings((prev) => ({
							...prev,
							baseBackgroundColumn: v,
						}));

						new ColumnSuggest(plugin, search.inputEl, getSettings).onSelect(
							(v) => {
								search.setValue(v);
								search.onChanged();
							}
						);
					});
				});
		});
};

class ColumnSuggest extends InputSuggest<string> {
	constructor(
		public plugin: BetterProperties,
		textInputEl: HTMLDivElement | HTMLInputElement,
		public getSettings: () => StandardSelectSettings
	) {
		super(plugin.app, textInputEl);
	}

	async getSuggestions(): Promise<string[]> {
		const { optionsType, inlineBase, baseFile } = this.getSettings();
		let query = "";
		if (optionsType === "inline-base") {
			query = inlineBase;
		}
		if (optionsType === "base-file") {
			const file = this.plugin.app.vault.getFileByPath(baseFile);
			query = file ? await this.plugin.app.vault.cachedRead(file) : "";
		}

		const embedComponent = await this.plugin.baseUtilityManager.evaluateBase({
			query,
		});
		const { order } = embedComponent.controller.view.config;
		embedComponent.unload();
		return order;
	}

	parseSuggestion(value: string): Suggestion {
		return {
			title: value,
		};
	}
}

class BasePathSuggest extends InputSuggest<TFile> {
	getSuggestions(query: string): TFile[] {
		const files = this.app.vault
			.getFiles()
			.filter((f) => f.extension.toLowerCase() === "base");
		if (!query) return files;
		const lower = query.toLowerCase();
		return files.filter((f) => f.path.toLowerCase().includes(lower));
	}

	parseSuggestion(value: TFile): Suggestion {
		return {
			title: value.basename,
			note: value.path,
		};
	}
}
