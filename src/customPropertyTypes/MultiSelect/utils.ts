import { tryCatch } from "~/lib/utils";
import BetterProperties from "~/main";
import { PropertySettings } from "../types";
import { Setting, Menu, Notice, MenuItem, normalizePath } from "obsidian";
import { ColorTextComponent } from "~/classes/ColorTextComponent";
import { ComboboxComponent, SearchableMenu } from "~/classes/ComboboxComponent";
import { FileSuggest } from "~/classes/InputSuggest/FileSuggest";
import { FolderSuggest } from "~/classes/InputSuggest/FolderSuggest";
import { TagSuggest } from "~/classes/InputSuggest/TagSuggest";
import { ListSetting } from "~/classes/ListSetting";
import { MultiselectComponent } from "~/classes/MultiSelect";
import { selectColors } from "~/lib/constants";
import { Icon } from "~/lib/types/icons";
import { PropertySettingsModal } from "../settings";
import { renderSettings } from "./renderSettings";
import { text } from "~/i18next";

export type SelectSettings = NonNullable<PropertySettings["multiselect"]>;
export type SelectOptionsType = NonNullable<SelectSettings["optionsType"]>;
export type SelectOption = NonNullable<SelectSettings["manualOptions"]>[number];

// prettier-ignore
export const selectOptionInlineCodeTemplate = 
`async (props) => {
	const appleOption = {
		value: "apple",
		label: "Apple", // optional
		bgColor: "red", // optional
	};
	const bananaoption = {
		value: "banana",
	};
	const arr = [appleOption, bananaoption];
	return arr;
};`

export const selectOptionJsFileTemplate =
	`module.default = ` + selectOptionInlineCodeTemplate;

export const defaultOption: SelectOption = {
	value: "",
	label: "",
	// bgColor: "",
	// textColor: "",
};

export type InlineCodeFunction = (props: {
	plugin: BetterProperties;
	sourcePath: string | undefined;
}) => Promise<SelectOption[]>;

export const tryRunInlineCode = async (
	plugin: BetterProperties,
	fnString: string | InlineCodeFunction
) => {
	return tryCatch(async () => {
		const fn: InlineCodeFunction =
			typeof fnString === "string" ? eval(fnString) : fnString;
		if (typeof fn !== "function") {
			throw new Error(`Expected type "function" but got type ${typeof fn}`);
		}
		const result = await fn({
			plugin,
			sourcePath: "",
		});
		if (!Array.isArray(result)) {
			throw new Error(`The value returned must be an array`);
		}
		result.forEach((item) => {
			if (typeof item !== "object" || !item) {
				throw new Error(
					`Expected type of item to be "object" but got type "${typeof item}"`
				);
			}
			if (typeof item.value !== "string") {
				throw new Error(
					`Expected typeof item.value to be "string" but got type "${typeof item.value}"`
				);
			}
		});
		return result;
	});
};

export const tryRunFileCode = async (
	plugin: BetterProperties,
	filePath: string
) => {
	return tryCatch(async () => {
		const normalPath = normalizePath(filePath);
		const file = plugin.app.vault.getFileByPath(normalPath);
		if (!file) {
			throw new Error(`File not found at path "${normalPath}"`);
		}

		if (!file.extension.toLowerCase().endsWith("js")) {
			throw new Error(
				`Expected file extension ".js" but got ".${file.extension}"`
			);
		}

		const content = await plugin.app.vault.cachedRead(file);
		const module: {
			default?: InlineCodeFunction;
		} = {};
		eval(content); // should define module.default

		if (typeof module.default !== "function") {
			throw new Error(
				`Expected typeof module.default to be "function" but got "${typeof module.default}"`
			);
		}

		const { success, data, error } = await tryRunInlineCode(
			plugin,
			module.default
		);
		if (success) return data;
		throw new Error(error);
	});
};

export const renderDefaultSettings = ({
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
};

export const renderManualSettings = ({
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
			text("customPropertyTypes.select.settings.optionsType.selectLabelManual")
		);

	renderManualOptionsSetting({
		plugin,
		parentEl,
		settings,
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

export const renderManualOptionsSetting = ({
	parentEl,
	settings,
}: {
	plugin: BetterProperties;
	parentEl: HTMLElement;
	settings: SelectSettings;
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

export const renderDynamicSettings = ({
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

export const renderFilesFromFolderSettings = ({
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

export const renderFilesFromTagSettings = ({
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

export const renderFilesFromInlineJsSettings = ({
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
				.setPlaceholder('(props) => [{value: "apple"}]')
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

export const renderFilesFromFileJsSetings = ({
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

export const renderFolderPathsSetting = ({
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
