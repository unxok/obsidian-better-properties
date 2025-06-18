import { Setting, Menu } from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType, PropertySettings } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/Classes/ListSetting";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { FolderSuggest } from "@/classes/FolderSuggest";

type Settings = PropertySettings["dropdown"];
type OptionsType = Settings["optionsType"];
type Option = Settings["manualOptions"][number];

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

	const typeDependentSettings = new Set<Setting | Set<Setting>>();

	new Setting(parentEl)
		.setName("Options type")
		.setDesc(
			"Whether to use manually defined options or a different dynamic way of determining available options"
		)
		.addDropdown((cmp) =>
			cmp
				.addOptions({
					manual: "Manual",
					dynamic: "Dynamic",
				} satisfies Record<Exclude<PropertySettings["dropdown"]["optionsType"], undefined>, string>)
				.setValue(settings.optionsType ?? "")
				.onChange((v) => {
					renderTypeDependentSettings(v as OptionsType);
					settings.optionsType = v as OptionsType;
				})
		)
		.then(() => renderTypeDependentSettings(settings.optionsType));

	function renderTypeDependentSettings(optionType: OptionsType) {
		typeDependentSettings.forEach((s) => {
			if (s instanceof Set) {
				s.forEach((ss) => ss.settingEl.remove());
				s.clear();
				return;
			}
			s.settingEl.remove();
		});
		typeDependentSettings.clear();

		if (optionType === "manual") {
			renderManualOptionsSetting({
				plugin,
				parentEl,
				settings,
				defaultOption,
				addSetting: (s) => typeDependentSettings.add(s),
			});
			return;
		}

		const dynamicTypeDependentSettings = new Set<Setting>();

		if (optionType === "dynamic") {
			const dynamicTypeSetting = new Setting(parentEl)
				.setName("Dynamic type")
				.setDesc("")
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
							const dType = v as NonNullable<Settings["dynamicOptionsType"]>;
							renderDynamicTypeDependendSettings(dType);
							settings.dynamicOptionsType = dType;
						})
						.then(() =>
							renderDynamicTypeDependendSettings(
								settings.dynamicOptionsType ?? "filesInFolder"
							)
						);
				});

			typeDependentSettings.add(dynamicTypeDependentSettings);

			function renderDynamicTypeDependendSettings(
				dynamicOptionsType: NonNullable<Settings["dynamicOptionsType"]>
			) {
				dynamicTypeDependentSettings.forEach((s) => s.settingEl.remove());
				dynamicTypeDependentSettings.clear();

				if (dynamicOptionsType === "filesInFolder") {
					dynamicTypeDependentSettings.add(
						new Setting(parentEl)
							.setName("Folder")
							.setDesc(
								"Notes in the provided folder will be shown as this dropdown's options"
							)
							.addSearch((search) => {
								search
									.setValue(settings.folderOptionsPath ?? "")
									.onChange((v) => {
										settings.folderOptionsPath = v;
									});
								new FolderSuggest(plugin.app, search);
							})
					);

					dynamicTypeDependentSettings.add(
						new Setting(parentEl)
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
				}

				if (dynamicOptionsType === "filesFromTag") {
					dynamicTypeDependentSettings.add(
						new Setting(parentEl)
							.setName("Tag(s)")
							.setDesc(
								"Notes with all of the following tags will be shown as this dropdown's options"
							)
							.addSearch((search) => {
								search.setValue(settings.tagOptionsTags?.join(", ") ?? "");
							})
					);
				}

				if (dynamicOptionsType === "script") {
					dynamicTypeDependentSettings.add(
						new Setting(parentEl)
							.setName("Script")
							.setDesc(
								"How to load the script, either inline to write code directly in this setting or external to point to a separate .js file"
							)
							.addSearch((search) => {
								search.setValue(settings.scriptOptionsExternalFile ?? "");
							})
					);
				}
			}

			typeDependentSettings.add(dynamicTypeSetting);
		}
	}
};

const renderManualOptionsSetting = ({
	// plugin,
	parentEl,
	settings,
	defaultOption,
	addSetting,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: Settings;
	defaultOption: Option;
	addSetting: (s: Setting) => void;
}) => {
	const list = new ListSetting<Option>(parentEl)
		.setName("Manual options")
		.setDesc("The manually created choices this dropdown can be set to")
		.setValue(settings.manualOptions)
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

	addSetting(list);
	return;
};
