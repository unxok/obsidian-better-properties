import { Setting, Menu, Notice, MenuItem } from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/classes/ListSetting";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { FolderSuggest } from "~/classes/InputSuggest/FolderSuggest";
import { TagSuggest } from "~/classes/InputSuggest/TagSuggest";
import { MultiselectComponent } from "~/classes/MultiSelect";
import { text } from "~/i18next";
import { selectColors } from "~/lib/constants";
import { ColorTextComponent } from "~/classes/ColorTextComponent";
import { PropertySettingsModal } from "../settings";
import {
	SelectOption,
	selectOptionInlineCodeTemplate,
	selectOptionJsFileTemplate,
	SelectOptionsType,
	SelectSettings,
	tryRunFileCode,
	tryRunInlineCode,
} from "./utils";
import { FileSuggest } from "~/classes/InputSuggest/FileSuggest";
import { ComboboxComponent, SearchableMenu } from "~/classes/ComboboxComponent";

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

	const defaultOption: SelectOption = {
		value: "",
		label: "",
		// bgColor: "",
		// textColor: "",
	};

	new Setting(parentEl)
		.setName(
			text("customPropertyTypes.select.settings.useDefaultDropdown.title")
		)
		.setDesc(
			text("customPropertyTypes.select.settings.useDefaultDropdown.desc")
		)
		.addToggle((cmp) => {
			cmp.setValue(settings.useDefaultStyle ?? false).onChange((b) => {
				settings.useDefaultStyle = b;
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
			defaultOption,
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

const renderManualSettings = ({
	plugin,
	parentEl,
	settings,
	defaultOption,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
	defaultOption: SelectOption;
}) => {
	new Setting(parentEl)
		.setHeading()
		.setName(
			text("customPropertyTypes.select.settings.optionsType.selectLabelManual")
		);

	renderManualOptionsSetting({
		plugin,
		parentEl,
		settings,
		defaultOption,
	});

	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.manual.allowCreateTitle"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.manual.allowCreateDesc"
			)
		)
		.addToggle((cmp) =>
			cmp.setValue(settings.manualAllowCreate ?? false).onChange((b) => {
				settings.manualAllowCreate = b;
			})
		);
};

const renderDynamicSettings = ({
	plugin,
	parentEl,
	settings,
	modal,
	property,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
	modal: PropertySettingsModal;
	property: string;
}) => {
	new Setting(parentEl)
		.setHeading()
		.setName(
			text("customPropertyTypes.select.settings.optionsType.selectLabelDynamic")
		);

	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.emptyLabelTitle"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.emptyLabelDesc"
			)
		)
		.addText((cmp) => {
			cmp.setValue(settings.dynamicEmptyLabel ?? "").onChange((v) => {
				settings.dynamicEmptyLabel = v;
			});
		});

	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.typeTitle"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.typeDesc"
			)
		)
		.addDropdown((dropdown) => {
			dropdown
				.addOptions({
					filesInFolder: text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesInFolderLabel"
					),
					filesFromTag: text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromTagLabel"
					),
					filesFromInlineJs: text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJsLabel"
					),
					filesFromJsFile: text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJsLabel"
					),
				} satisfies Record<NonNullable<SelectSettings["dynamicOptionsType"]>, string>)
				.setValue(
					settings.dynamicOptionsType ??
						("filesInFolder" satisfies NonNullable<
							SelectSettings["dynamicOptionsType"]
						>)
				)
				.onChange((v) => {
					const opt = v as NonNullable<SelectSettings["dynamicOptionsType"]>;
					settings.dynamicOptionsType = opt;
					parentEl.empty();
					renderSettings({ plugin, modal, property });
				});
		});
};

const renderFilesFromFolderSettings = ({
	plugin,
	parentEl,
	settings,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
}) => {
	new Setting(parentEl)
		.setHeading()
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesInFolderLabel"
			)
		);
	renderFolderPathsSetting({
		plugin,
		parentEl,
		settings,
	});
	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesInFolder.excludeFolderNotes.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesInFolder.excludeFolderNotes.desc"
			)
		)
		.addToggle((toggle) => {
			toggle
				.setValue(settings.folderOptionsExcludeFolderNote ?? false)
				.onChange((b) => {
					settings.folderOptionsExcludeFolderNote = b;
				});
		});
};

const renderFilesFromTagSettings = ({
	plugin,
	parentEl,
	settings,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
}) => {
	new Setting(parentEl)
		.setHeading()
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromTagLabel"
			)
		);
	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromTag.tags.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromTag.tags.desc"
			)
		)
		.then((s) => {
			const tagsMultiSelect = new MultiselectComponent(s);
			tagsMultiSelect
				.setValues(settings.tagOptionsTags ?? [])
				.onChange((v) => (settings.tagOptionsTags = v))
				.addSuggest((inputEl) => {
					const sugg = new TagSuggest(plugin.app, inputEl)
						.setFilter((v) => !tagsMultiSelect.values.contains(v.tag))
						.onSelect((v, e) => {
							e.preventDefault();
							e.stopImmediatePropagation();
							inputEl.textContent = v.tag;
							tagsMultiSelect.inputEl.blur();
							tagsMultiSelect.inputEl.focus();
						});
					return sugg;
				})
				.renderValues();
		});
	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromTag.includeNestedTags.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromTag.includeNestedTags.desc"
			)
		)
		.addToggle((toggle) =>
			toggle
				.setValue(settings.tagOptionsIncludeNested ?? false)
				.onChange((b) => (settings.tagOptionsIncludeNested = b))
		);
};

const renderFilesFromInlineJsSettings = ({
	plugin,
	parentEl,
	settings,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
}) => {
	new Setting(parentEl)
		.setHeading()
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJsLabel"
			)
		);

	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJs.code.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJs.code.desc"
			)
		)
		.addTextArea((cmp) => {
			cmp
				.setValue(settings.inlineJsOptionsCode ?? "")
				.setPlaceholder('(props) => [{value: "foo"}]')
				.onChange((v) => {
					settings.inlineJsOptionsCode = v;
				});
		})
		.addExtraButton((cmp) => {
			cmp
				.setIcon("lucide-copy" satisfies Icon)
				.setTooltip(
					text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJs.code.helpText"
					)
				)
				.onClick(async () => {
					await navigator.clipboard.writeText(selectOptionInlineCodeTemplate);
					new Notice(
						text(
							"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJs.code.copySuccessNotice"
						)
					);
				});
		})
		.addExtraButton((cmp) => {
			cmp
				.setIcon("lucide-play-circle" satisfies Icon)
				.setTooltip(
					text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromInlineJs.code.runInConsole"
					)
				)
				.onClick(async () => {
					if (!settings.inlineJsOptionsCode) {
						return;
					}
					const { success, data, error } = await tryRunInlineCode(
						plugin,
						settings.inlineJsOptionsCode
					);

					if (success) {
						console.log(data);
						new Notice("Validation successful");
						return;
					}

					console.error(error);
					new Notice(
						createFragment((frag) => {
							frag.appendText("Validation failed");
							frag.createEl("br");
							frag.appendText(error);
						})
					);
				});
		});
};

const renderFilesFromFileJsSetings = ({
	plugin,
	parentEl,
	settings,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
}) => {
	new Setting(parentEl)
		.setHeading()
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJsLabel"
			)
		);

	new Setting(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJs.filePath.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJs.filePath.desc"
			)
		)
		.addText((cmp) => {
			cmp.setValue(settings.fileJsOptionsPath ?? "").onChange((v) => {
				settings.fileJsOptionsPath = v;
			});
			new FileSuggest(plugin.app, cmp.inputEl)
				.setFilter((f) => f.extension.toLowerCase().endsWith("js"))
				.onSelect((f) => {
					cmp.setValue(f.path);
					cmp.onChanged();
				});
		})
		.addExtraButton((cmp) => {
			cmp
				.setIcon("lucide-copy" satisfies Icon)
				.setTooltip(
					text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJs.filePath.helpText"
					)
				)
				.onClick(async () => {
					await navigator.clipboard.writeText(selectOptionJsFileTemplate);
					new Notice(
						text(
							"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJs.filePath.copySuccessNotice"
						)
					);
				});
		})
		.addExtraButton((cmp) => {
			cmp
				.setIcon("lucide-play-circle" satisfies Icon)
				.setTooltip(
					text(
						"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesFromFileJs.filePath.runInConsole"
					)
				)
				.onClick(async () => {
					if (!settings.fileJsOptionsPath) {
						return;
					}
					const { success, data, error } = await tryRunFileCode(
						plugin,
						settings.fileJsOptionsPath
					);

					if (success) {
						console.log(data);
						new Notice("Validation successful");
						return;
					}

					console.error(error);
					new Notice(
						createFragment((frag) => {
							frag.appendText("Validation failed");
							frag.createEl("br");
							frag.appendText(error);
						})
					);
				});
		});
};

////

const renderManualOptionsSetting = ({
	parentEl,
	settings,
	defaultOption,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
	defaultOption: SelectOption;
}) => {
	const list = new ListSetting<SelectOption>(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.manual.optionsTitle"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.manual.optionsDesc"
			)
		)
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
						.setPlaceholder(text("common.valuePlaceholder"))
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
						.setPlaceholder(text("common.optionalLabelPlaceholder"))
						.setValue(label ?? "")
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							matched.label = v;
						})
				)
				.then(() => {
					const combobox = new SelectColorCombobox(item.controlEl);
					const options: {
						value: string;
						label: string;
					}[] = Object.entries(selectColors).reduce((acc, [label, value]) => {
						acc.push({
							value,
							label,
						});
						return acc;
					}, [] as typeof options);
					combobox.addOptions(options);
					combobox.setValue(opt.bgColor ?? selectColors.gray);
					combobox.onChange((v) => {
						opt.bgColor = v;
					});
				})
				.addDeleteButton();
		})
		.renderAllItems()
		.addFooterButton((btn) =>
			btn.setIcon("lucide-sort-asc" satisfies Icon).onClick((ev) => {
				const menu = new Menu()
					.setNoIcon()
					.addItem((item) =>
						item.setTitle(text("common.sort.valueAlphabetical")).onClick(() => {
							list.value.sort((a, b) =>
								(a?.value ?? "").localeCompare(b?.value ?? "")
							);
							list.renderAllItems();
						})
					)
					.addItem((item) =>
						item
							.setTitle(text("common.sort.valueReverseAlphabetical"))
							.onClick(() => {
								list.value.sort((a, b) =>
									(b?.value ?? "").localeCompare(a?.value ?? "")
								);
								list.renderAllItems();
							})
					)
					.addItem((item) =>
						item.setTitle(text("common.sort.labelAlphabetical")).onClick(() => {
							list.value.sort((a, b) =>
								(a?.label ?? "").localeCompare(b?.label ?? "")
							);
							list.renderAllItems();
						})
					)
					.addItem((item) =>
						item
							.setTitle(text("common.sort.labelReverseAlphabetical"))
							.onClick(() => {
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
	settings: SelectSettings;
}) => {
	const folderPathsSetting = new ListSetting<string>(parentEl)
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesInFolder.folderPaths.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.filesInFolder.folderPaths.desc"
			)
		)
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
							.setTitle(text("common.sort.nameAlphabetical"))
							.onClick(() => {
								folderPathsSetting.sort((a, b) =>
									name(a).localeCompare(name(b))
								);
							})
					)
					.addItem((item) =>
						item
							.setSection("name")
							.setTitle(text("common.sort.nameReverseAlphabetical"))
							.onClick(() => {
								folderPathsSetting.sort((a, b) =>
									name(b).localeCompare(name(a))
								);
							})
					)
					.addItem((item) =>
						item
							.setSection("path")
							.setTitle(text("common.sort.pathAlphabetical"))
							.onClick(() => {
								folderPathsSetting.sort((a, b) => a.localeCompare(b));
							})
					)
					.addItem((item) =>
						item
							.setSection("path")
							.setTitle(text("common.sort.pathReverseAlphabetical"))
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

class SelectColorCombobox extends ComboboxComponent<{
	value: string;
	label: string;
}> {
	constructor(containerEl: HTMLElement) {
		super(containerEl);
	}

	override getValueFromOption(option: {
		value: string;
		label: string;
	}): string {
		return option.value;
	}

	override setValue(value: string): this {
		super.setValue(value);
		this.setEmptyClass(false);
		this.selectEl.textContent = "";
		this.selectEl.setCssProps({
			"--better-properties-bg": value,
		});

		return this;
	}

	override createAuxEl(containerEl: HTMLElement): HTMLElement {
		const auxEl = super.createAuxEl(containerEl);
		auxEl.remove();
		return auxEl;
	}

	override onRenderMenuItem(
		item: MenuItem,
		option: { value: string; label: string }
	): void {
		super.onRenderMenuItem(item, option);
		const { value, label } = option;
		item.titleEl.empty();
		item.removeIcon();
		const innerEl = item.titleEl.createDiv({
			cls: "better-properties-select-option",
			text: label,
		});
		innerEl.setCssProps({
			"--better-properties-select-bg": value ?? selectColors.gray,
		});
	}

	override createSelectEl(containerEl: HTMLElement): HTMLDivElement {
		const el = super.createSelectEl(containerEl);
		el.classList.add("better-properties-swatch");
		return el;
	}

	override createMenu(): SearchableMenu {
		const menu = super.createMenu();
		menu.addSectionItem("footer", (item) => {
			item
				.setIcon("lucide-paintbrush" satisfies Icon)
				.setTitle("Custom color")
				.setSubmenu()
				.addItem((subItem) => {
					subItem.removeIcon();
					const cmp = new ColorTextComponent(subItem.titleEl);
					cmp.setValue(this.getValue());
					cmp.onChange((v) => {
						this.setValue(v);
						this.onChanged();
					});
					subItem.onClick((e) => {
						e.stopImmediatePropagation();
						e.stopPropagation();
						cmp.textComponent.inputEl.focus();
					});
				});
		});

		return menu;
	}
}
