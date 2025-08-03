import { Setting, Menu } from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType, PropertySettings } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/Classes/ListSetting";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { FolderSuggest } from "~/Classes/InputSuggest/FolderSuggest";
import { TagSuggest } from "~/Classes/InputSuggest/TagSuggest";
import { MultiSelectComponent } from "~/Classes/MultiSelect";
import {
	ConditionalSettings,
	SettingsGroup,
} from "~/Classes/ConditionalSettings";

type Settings = NonNullable<PropertySettings["dropdown"]>;
type OptionsType = NonNullable<Settings["optionsType"]>;
type DynamicOptionsType = NonNullable<Settings["dynamicOptionsType"]>;
type Option = NonNullable<Settings["manualOptions"]>[number];

export const renderSettings: CustomPropertyType<string>["renderSettings"] = ({
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

	const defaultOption: Option = {
		value: "",
		label: "",
		// bgColor: "",
		// textColor: "",
	};

	new Setting(parentEl)
		.setName("Options type")
		.setDesc(
			"Whether to use manually defined options or a different dynamic way of determining available options"
		)
		.addDropdown((dropdown) => {
			dropdown
				.addOptions({
					manual: "Manual",
					dynamic: "Dynamic",
				} satisfies Record<Exclude<OptionsType, undefined>, string>)
				.setValue(settings?.optionsType ?? "")
				.onChange((v) => {
					const opt = v as OptionsType;
					optionsTypeSettings.showGroup(opt);
					settings.optionsType = opt;
				});
		});

	const optionsTypeSettings = new ConditionalSettings<OptionsType>(parentEl);
	optionsTypeSettings
		.addGroup("manual", (group) =>
			group.addSetting((s) => {
				s.settingEl.remove();
				group.set.add(
					renderManualOptionsSetting({
						plugin,
						parentEl,
						settings,
						defaultOption,
					})
				);
			})
		)
		.addGroup("dynamic", (group) => {
			group.addSetting((s) =>
				s
					.setName("Dynamic type")
					.setDesc(
						"Which method to use to dynamically determine available options"
					)
					.addDropdown((dropdown) => {
						dropdown
							.addOptions({
								filesInFolder: "Files from folder",
								filesFromTag: "Files from tag",
								script: "Options from script",
							} satisfies Record<NonNullable<Settings["dynamicOptionsType"]>, string>)
							.setValue(
								settings.dynamicOptionsType ??
									("filesInFolder" satisfies NonNullable<
										Settings["dynamicOptionsType"]
									>)
							)
							.onChange((v) => {
								const opt = v as NonNullable<Settings["dynamicOptionsType"]>;
								dynamicOptionsTypeSettings.showGroup(opt);
								settings.dynamicOptionsType = opt;
							});
						dynamicOptionsTypeSettings.showGroup(
							settings.dynamicOptionsType ??
								("filesInFolder" satisfies NonNullable<
									Settings["dynamicOptionsType"]
								>)
						);
					})
			);

			const dynamicOptionsTypeSettings =
				new ConditionalSettings<DynamicOptionsType>(
					parentEl,
					optionsTypeSettings
				)
					.addGroup("filesInFolder", (group) =>
						renderFilesInFolderGroup({ group, plugin, parentEl, settings })
					)
					.addGroup("filesFromTag", (group) =>
						renderFilesFromTagGroup({ group, plugin, settings })
					);
		});

	optionsTypeSettings.showGroup(settings.optionsType ?? "manual");

	// function renderTypeDependentSettings(optionType: OptionsType) {
	// 	typeDependentSettings.forEach((s) => {
	// 		if (s instanceof Set) {
	// 			s.forEach((ss) => ss.settingEl.remove());
	// 			s.clear();
	// 			return;
	// 		}
	// 		s.settingEl.remove();
	// 	});
	// 	typeDependentSettings.clear();

	// 	if (optionType === "manual") {
	// 		renderManualOptionsSetting({
	// 			plugin,
	// 			parentEl,
	// 			settings,
	// 			defaultOption,
	// 			addSetting: (s) => typeDependentSettings.add(s),
	// 		});
	// 		return;
	// 	}

	// 	const dynamicTypeDependentSettings = new Set<Setting>();

	// 	if (optionType === "dynamic") {
	// 		const dynamicTypeSetting = new Setting(parentEl)
	// 			.setName("Dynamic type")
	// 			.setDesc("")
	// 			.addDropdown((dropdown) => {
	// 				dropdown
	// 					.addOptions({
	// 						filesInFolder: "Files from folder",
	// 						filesFromTag: "Files from tag",
	// 						script: "Options from script",
	// 					} satisfies Record<NonNullable<Settings["dynamicOptionsType"]>, string>)
	// 					.setValue(
	// 						settings.dynamicOptionsType ??
	// 							("filesInFolder" satisfies NonNullable<
	// 								Settings["dynamicOptionsType"]
	// 							>)
	// 					)
	// 					.onChange((v) => {
	// 						const dType = v as NonNullable<Settings["dynamicOptionsType"]>;
	// 						renderDynamicTypeDependendSettings(dType);
	// 						settings.dynamicOptionsType = dType;
	// 					})
	// 					.then(() =>
	// 						renderDynamicTypeDependendSettings(
	// 							settings.dynamicOptionsType ?? "filesInFolder"
	// 						)
	// 					);
	// 			});

	// 		typeDependentSettings.add(dynamicTypeDependentSettings);

	// 		function renderDynamicTypeDependendSettings(
	// 			dynamicOptionsType: NonNullable<Settings["dynamicOptionsType"]>
	// 		) {
	// 			dynamicTypeDependentSettings.forEach((s) => s.settingEl.remove());
	// 			dynamicTypeDependentSettings.clear();

	// 			if (dynamicOptionsType === "filesInFolder") {
	// const folderPathsSetting = new ListSetting<string>(parentEl)
	// 	.setName("Folder paths")
	// 	.setDesc(
	// 		"Notes in the following folders will be options for this dropdown"
	// 	)
	// 	.setValue(settings.folderOptionsPaths ?? [])
	// 	.onCreateItem((value, item) => {
	// 		item
	// 			.addDragButton()
	// 			.addSearch((search) => {
	// 				search.setValue(value).onChange((v) => {
	// 					item.list.setItemValue(item.index, v);
	// 				});
	// 				new FolderSuggest(plugin.app, search.inputEl, {
	// 					showFileCountAux: true,
	// 				}).onSelect((v) => {
	// 					search.setValue(v.path);
	// 					search.onChanged();
	// 				});
	// 			})
	// 			.addDeleteButton();
	// 	})
	// 	.onChange((v) => {
	// 		settings.folderOptionsPaths = v;
	// 	})
	// 	.renderAllItems()
	// 	.addFooterButton((btn) => {
	// 		btn.setIcon("lucide-sort-asc" satisfies Icon).onClick((e) => {
	// 			const name = (path: string) => path.split("/").reverse()[0];
	// 			new Menu()
	// 				.setNoIcon()
	// 				.addItem((item) =>
	// 					item
	// 						.setSection("name")
	// 						.setTitle("Sort by name (A - Z)")
	// 						.onClick(() => {
	// 							folderPathsSetting.sort((a, b) =>
	// 								name(a).localeCompare(name(b))
	// 							);
	// 						})
	// 				)
	// 				.addItem((item) =>
	// 					item
	// 						.setSection("name")
	// 						.setTitle("Sort by name (Z - A)")
	// 						.onClick(() => {
	// 							folderPathsSetting.sort((a, b) =>
	// 								name(b).localeCompare(name(a))
	// 							);
	// 						})
	// 				)
	// 				.addItem((item) =>
	// 					item
	// 						.setSection("path")
	// 						.setTitle("Sort by path (A - Z)")
	// 						.onClick(() => {
	// 							folderPathsSetting.sort((a, b) => a.localeCompare(b));
	// 						})
	// 				)
	// 				.addItem((item) =>
	// 					item
	// 						.setSection("path")
	// 						.setTitle("Sort by path (Z - A)")
	// 						.onClick(() => {
	// 							folderPathsSetting.sort((a, b) => b.localeCompare(a));
	// 						})
	// 				)
	// 				.showAtMouseEvent(e);
	// 		});
	// 	})
	// 	.addFooterButton((btn) => {
	// 		btn
	// 			.setCta()
	// 			.setIcon("lucide-plus" satisfies Icon)
	// 			.onClick(() => {
	// 				folderPathsSetting.addItem("");
	// 			});
	// 	});
	// dynamicTypeDependentSettings.add(folderPathsSetting);

	// dynamicTypeDependentSettings.add(
	// 	new Setting(parentEl)
	// 		.setName("Exclude Folder Notes")
	// 		.setDesc(
	// 			"Whether to exclude notes that have the same name as their folder"
	// 		)
	// 		.addToggle((toggle) => {
	// 			toggle
	// 				.setValue(settings.folderOptionsExcludeFolderNote ?? false)
	// 				.onChange((b) => {
	// 					settings.folderOptionsExcludeFolderNote = b;
	// 				});
	// 		})
	// );
	// 			}

	// 			if (dynamicOptionsType === "filesFromTag") {
	// 				dynamicTypeDependentSettings.add(
	// 					new Setting(parentEl)
	// 		.setName("Tag(s)")
	// 		.setDesc(
	// 			"Notes with all of the following tags will be shown as this dropdown's options"
	// 		)
	// 		.then((s) => {
	// 			const tagsMultiSelect = new MultiSelectComponent(s)
	// 				.setValues(settings.tagOptionsTags ?? [])
	// 				.onChange((v) => (settings.tagOptionsTags = v))
	// 				.addSuggest((inputEl) => {
	// 					new TagSuggest(plugin.app, inputEl)
	// 						.setFilter(
	// 							(v) =>
	// 								!tagsMultiSelect.findDuplicate(
	// 									v.tag,
	// 									tagsMultiSelect.values
	// 								)
	// 						)
	// 						.showHashtags(false)
	// 						.onSelect((v, e) => {
	// 							e.preventDefault();
	// 							e.stopImmediatePropagation();
	// 							inputEl.textContent = v.tag;
	// 							tagsMultiSelect.inputEl.blur();
	// 							tagsMultiSelect.inputEl.focus();
	// 						});
	// 				})
	// 				.renderValues();
	// 		})
	// );
	// 			}

	// 			if (dynamicOptionsType === "script") {
	// 				dynamicTypeDependentSettings.add(
	// 					new Setting(parentEl)
	// 						.setName("Script")
	// 						.setDesc(
	// 							"How to load the script, either inline to write code directly in this setting or external to point to a separate .js file"
	// 						)
	// 						.addSearch((search) => {
	// 							search.setValue(settings.scriptOptionsExternalFile ?? "");
	// 						})
	// 				);
	// 			}
	// 		}

	// 		typeDependentSettings.add(dynamicTypeSetting);
	// 	}
	// }
};

const renderManualOptionsSetting = ({
	// plugin,
	parentEl,
	settings,
	defaultOption,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: Settings;
	defaultOption: Option;
}) => {
	const list = new ListSetting<Option>(parentEl)
		.setName("Manual options")
		.setDesc("The manually created choices this dropdown can be set to")
		.setValue(settings.manualOptions ?? [])
		.onChange((v) => (settings.manualOptions = [...v]))
		.onCreateItem((opt, item) => {
			if (opt === undefined || item === undefined) {
				throw new Error("onCreateItem called with undefined");
			}
			const { value, label } = opt;
			item
				.addDragButton()
				.addText((txt) =>
					txt
						.setPlaceholder("value")
						.setValue(value)
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							matched.value = v;
						})
						.then((inp) => item.onFocus(() => inp.inputEl.focus()))
				)
				.addText((txt) =>
					txt
						.setPlaceholder("label (optional)")
						.setValue(label ?? "")
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							matched.label = v;
						})
				)
				.addDeleteButton();
		})
		.renderAllItems()
		.addFooterButton((btn) =>
			btn.setIcon("lucide-sort-asc" satisfies Icon).onClick((ev) => {
				const menu = new Menu()
					.setNoIcon()
					.addItem((item) =>
						item.setTitle("Value (A - Z)").onClick(() => {
							list.value.sort((a, b) =>
								(a?.value ?? "").localeCompare(b?.value ?? "")
							);
							list.renderAllItems();
						})
					)
					.addItem((item) =>
						item.setTitle("Value (Z - A)").onClick(() => {
							list.value.sort((a, b) =>
								(b?.value ?? "").localeCompare(a?.value ?? "")
							);
							list.renderAllItems();
						})
					)
					.addItem((item) =>
						item.setTitle("Label (A - Z)").onClick(() => {
							list.value.sort((a, b) =>
								(a?.label ?? "").localeCompare(b?.label ?? "")
							);
							list.renderAllItems();
						})
					)
					.addItem((item) =>
						item.setTitle("Label (Z - A)").onClick(() => {
							list.value.sort((a, b) =>
								(b?.label ?? "").localeCompare(a?.label ?? "")
							);
							list.renderAllItems();
						})
					);
				menu.showAtMouseEvent(ev);
			})
		)
		.addFooterButton((btn) =>
			btn
				.setCta()
				.setIcon("lucide-plus" satisfies Icon)
				.onClick(() => {
					list.addItem({
						value: defaultOption?.value ?? "",
						label: defaultOption?.label ?? "",
					});
				})
		);

	return list;
};

const renderFolderPathsSetting = ({
	plugin,
	parentEl,
	settings,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: Settings;
}) => {
	const folderPathsSetting = new ListSetting<string>(parentEl)
		.setName("Folder paths")
		.setDesc("Notes in the following folders will be options for this dropdown")
		.setValue(settings.folderOptionsPaths ?? [])
		.onCreateItem((value, item) => {
			item
				.addDragButton()
				.addSearch((search) => {
					search.setValue(value).onChange((v) => {
						item.list.setItemValue(item.index, v);
					});
					new FolderSuggest(plugin.app, search.inputEl, {
						showFileCountAux: true,
					}).onSelect((v) => {
						search.setValue(v.path);
						search.onChanged();
					});
				})
				.addDeleteButton();
		})
		.onChange((v) => {
			settings.folderOptionsPaths = v;
		})
		.renderAllItems()
		.addFooterButton((btn) => {
			btn.setIcon("lucide-sort-asc" satisfies Icon).onClick((e) => {
				const name = (path: string) => path.split("/").reverse()[0];
				new Menu()
					.setNoIcon()
					.addItem((item) =>
						item
							.setSection("name")
							.setTitle("Sort by name (A - Z)")
							.onClick(() => {
								folderPathsSetting.sort((a, b) =>
									name(a).localeCompare(name(b))
								);
							})
					)
					.addItem((item) =>
						item
							.setSection("name")
							.setTitle("Sort by name (Z - A)")
							.onClick(() => {
								folderPathsSetting.sort((a, b) =>
									name(b).localeCompare(name(a))
								);
							})
					)
					.addItem((item) =>
						item
							.setSection("path")
							.setTitle("Sort by path (A - Z)")
							.onClick(() => {
								folderPathsSetting.sort((a, b) => a.localeCompare(b));
							})
					)
					.addItem((item) =>
						item
							.setSection("path")
							.setTitle("Sort by path (Z - A)")
							.onClick(() => {
								folderPathsSetting.sort((a, b) => b.localeCompare(a));
							})
					)
					.showAtMouseEvent(e);
			});
		})
		.addFooterButton((btn) => {
			btn
				.setCta()
				.setIcon("lucide-plus" satisfies Icon)
				.onClick(() => {
					folderPathsSetting.addItem("");
				});
		});
	return folderPathsSetting;
};

const renderFilesInFolderGroup = ({
	group,
	plugin,
	parentEl,
	settings,
}: {
	group: SettingsGroup;
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: Settings;
}) =>
	group
		.addSetting((s) => {
			s.settingEl.remove();
			group.set.add(renderFolderPathsSetting({ plugin, parentEl, settings }));
		})
		.addSetting((s) =>
			s
				.setName("Exclude Folder Notes")
				.setDesc(
					"Whether to exclude notes that have the same name as their folder"
				)
				.addToggle((toggle) => {
					toggle
						.setValue(settings.folderOptionsExcludeFolderNote ?? false)
						.onChange((b) => {
							settings.folderOptionsExcludeFolderNote = b;
						});
				})
		);

const renderFilesFromTagGroup = ({
	group,
	plugin,
	settings,
}: {
	group: SettingsGroup;
	plugin: BetterProperties;
	settings: Settings;
}) =>
	group
		.addSetting((s) =>
			s
				.setName("Tag(s)")
				.setDesc(
					"Notes with all of the following tags will be shown as this dropdown's options"
				)
				.then((s) => {
					const tagsMultiSelect = new MultiSelectComponent(s)
						.setValues(settings.tagOptionsTags ?? [])
						.onChange((v) => (settings.tagOptionsTags = v))
						.addSuggest((inputEl) => {
							new TagSuggest(plugin.app, inputEl)
								.setFilter(
									(v) =>
										!tagsMultiSelect.findDuplicate(
											v.tag,
											tagsMultiSelect.values
										)
								)
								.showHashtags(false)
								.onSelect((v, e) => {
									e.preventDefault();
									e.stopImmediatePropagation();
									inputEl.textContent = v.tag;
									tagsMultiSelect.inputEl.blur();
									tagsMultiSelect.inputEl.focus();
								});
						})
						.renderValues();
				})
		)
		.addSetting((s) =>
			s
				.setName("Include Nested Tags")
				.setDesc(
					'Whether to include files containing a nested tag of one of the selected tags. For example, whether to include a note with the tag "food/fruit" when "food" is a selected tag'
				)
				.addToggle((toggle) =>
					toggle
						.setValue(settings.tagOptionsIncludeNested ?? false)
						.onChange((b) => (settings.tagOptionsIncludeNested = b))
				)
		);
