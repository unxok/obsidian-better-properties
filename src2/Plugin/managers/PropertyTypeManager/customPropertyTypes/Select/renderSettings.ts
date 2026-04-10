import { SettingGroup, TFile } from "obsidian";
import { CustomPropertyType } from "../../types";
import typeKey from "./type";
import { PropertySettings } from "../../schema";
import { renderManualSettings } from "./utils/renderManualSettings";
import { InputSuggest, Suggestion } from "~/classes/InputSuggest";
import { BetterProperties } from "#/Plugin";

type Settings = PropertySettings["types"][typeof typeKey];

export default (({ plugin, containerEl, propertyName, modal }) => {
	const getSettings = () =>
		plugin.propertyTypeManager.getPropertyTypeSettings(propertyName, typeKey);
	const settings = getSettings();

	const updateSettings = async (
		cb: (s: typeof settings) => typeof settings
	) => {
		await plugin.propertyTypeManager.updatePropertyTypeSettings(
			propertyName,
			typeKey,
			cb
		);
	};

	const reRenderModal = () => {
		modal.contentEl.empty();
		modal.onOpen();
	};

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
					} satisfies Record<Settings["optionsType"], string>)
					.setValue(settings.optionsType)
					.onChange(async (v) => {
						await updateSettings((s) => ({
							...s,
							optionsType: v as Settings["optionsType"],
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

	const baseSettingGroup = new SettingGroup(containerEl);

	if (settings.optionsType === "inline-base") {
		baseSettingGroup.addSetting((s) => {
			s.setName("Base config")
				.setDesc("The configuration for the inline base.")
				.addButton((button) => {
					button.setButtonText("Edit").onClick(async () => {
						await plugin.baseUtilityManager.openBaseEditorModal({
							query: settings.inlineBase,
							onClose: async ({ embedComponent }) => {
								const query = embedComponent.controller.query?.toString() ?? "";
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
			s.setName("Base file")
				.setDesc("The base file to use.")
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

	if (
		settings.optionsType === "inline-base" ||
		settings.optionsType === "base-file"
	) {
		baseSettingGroup
			.addSetting((s) => {
				s.setName("Label column name")
					.setDesc(
						"The column name in the base to use to get the displayed label for each option. If not set, the file's short name is used."
					)
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
				s.setName("Background column name")
					.setDesc(
						"The column name in the base to use to get the background for each option. If not set, the file's path is used to pick a random color."
					)
					.addSearch((search) => {
						search
							.setValue(settings.baseBackgroundColumn)
							.onChange(async (v) => {
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
	}
}) satisfies CustomPropertyType["renderSettings"];

class ColumnSuggest extends InputSuggest<string> {
	constructor(
		public plugin: BetterProperties,
		textInputEl: HTMLDivElement | HTMLInputElement,
		public getSettings: () => Settings
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

		const controller = await this.plugin.baseUtilityManager.evaluateBase({
			query,
		});
		return controller.view.config.order;
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
