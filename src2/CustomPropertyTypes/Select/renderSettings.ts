import {
	Setting,
	Menu,
	App,
	ValueComponent,
	TextComponent,
	ColorComponent,
	Modal,
	setTooltip,
} from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType, PropertySettings } from "../types";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/Classes/ListSetting";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { FolderSuggest } from "~/Classes/InputSuggest/FolderSuggest";
import { TagSuggest } from "~/Classes/InputSuggest/TagSuggest";
import { MultiselectComponent } from "~/Classes/MultiSelect";
import {
	ConditionalSettings,
	SettingsGroup,
} from "~/Classes/ConditionalSettings";
import { text } from "~/i18next";
import { InputSuggest, Suggestion } from "~/Classes/InputSuggest";
import {
	selectColors,
	selectBackgroundCssVar,
	backgroundCssVar,
} from "~/lib/constants";
import { ColorTextComponent } from "~/Classes/ColorTextComponent";

type Settings = NonNullable<PropertySettings["select"]>;
type OptionsType = NonNullable<Settings["optionsType"]>;
type DynamicOptionsType = NonNullable<Settings["dynamicOptionsType"]>;
type Option = NonNullable<Settings["manualOptions"]>[number];

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

	const defaultOption: Option = {
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
					.setName(
						text(
							"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.title"
						)
					)
					.setDesc(
						text(
							"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.desc"
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
								script: text(
									"customPropertyTypes.select.settings.optionsTypeSettings.dynamic.scriptLabel"
								),
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
};

const renderManualOptionsSetting = ({
	plugin,
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
		.setName(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.manual.title"
			)
		)
		.setDesc(
			text(
				"customPropertyTypes.select.settings.optionsTypeSettings.manual.desc"
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
					// new ColorSelect(plugin.app, item.controlEl)
					// 	.setValue(
					// 		opt.bgColor ?? ("gray" satisfies keyof typeof selectColors)
					// 	)
					// 	.onChange((v) => {
					// 		const matched = list.value[item.index];
					// 		if (matched === undefined) return;
					// 		matched.bgColor = v;
					// 	});
					const swatchEl = item.controlEl.createDiv({
						cls: "better-properties-swatch",
					});
					const swatchInputEl = swatchEl.createDiv({
						cls: "better-properties-swatch-input",
						attr: {
							"role": "button",
							"aria-index": "0",
							"contenteditable": "true",
						},
					});

					swatchEl.addEventListener("click", () => {
						swatchInputEl.focus();
					});

					swatchInputEl.addEventListener("focus", () => {
						const { win } = swatchInputEl;
						const range = win.document.createRange();
						range.selectNodeContents(swatchInputEl);
						const selection = win.getSelection();
						if (selection) {
							selection.removeAllRanges();
							selection.addRange(range);
						}
					});

					setTooltip(swatchEl, opt.bgColor ?? "unset");
					const setBgCssVar = (color: string) => {
						swatchEl.style.setProperty(backgroundCssVar, color);
					};
					setBgCssVar(opt.bgColor ?? selectColors.gray);

					const setValue = (value: string) => {
						const matched = list.value[item.index];
						if (matched === undefined) return;
						matched.bgColor = value;
						setBgCssVar(value);
						setTooltip(swatchEl, value);
					};

					const suggest = new ColorSuggest(plugin.app, swatchInputEl).onSelect(
						(opt) => {
							setValue(opt.value);
							suggest.close();
						}
					);

					suggest.setValue(
						opt.bgColor ?? "var(--better-properties-select-custom)"
					);
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
	settings: Settings;
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
				})
		)
		.addSetting((s) =>
			s
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
				)
		);

type ColorOption = {
	key: string;
	value: string;
};

class ColorSuggest extends InputSuggest<ColorOption> {
	constructor(app: App, textInputEl: HTMLDivElement | HTMLInputElement) {
		super(app, textInputEl);

		textInputEl.addEventListener("keydown", () => {
			this.isTyping = true;
		});

		textInputEl.addEventListener("blur", () => {
			this.isTyping = false;
		});
	}

	isTyping: boolean = false;
	getSuggestions(): ColorOption[] {
		const query = this.textInputEl.textContent.toLowerCase();
		const suggestions: ColorOption[] = [
			{
				key: "custom",
				value: "var(--better-properties-select-custom)",
			},
			...Object.entries(selectColors).reduce((acc, [key, value]) => {
				acc.push({ key, value });
				return acc;
			}, [] as ColorOption[]),
		];

		if (!query || !this.isTyping) {
			return suggestions;
		}
		return suggestions.filter((s) => s.key.toLowerCase().includes(query));
	}

	parseSuggestion({ key }: ColorOption): Suggestion {
		return {
			title: key,
		};
	}

	renderSuggestion(opt: ColorOption, el: HTMLElement) {
		super.renderSuggestion(opt, el);
		el.classList.add("better-properties-select-option");
		el.style.setProperty(selectBackgroundCssVar, opt.value);
		if (opt.key !== "custom") return;
		el.addEventListener("click", (e) => {
			this.close();
			e.preventDefault();
			const modal = new Modal(this.app);
			new Setting(modal.contentEl)
				.setName("Custom color")
				.setDesc("Select a color or enter any valid CSS value for background.")
				.then((s) => {
					new ColorTextComponent(s.controlEl)
						.setValue(this.getValue())
						.onChange((value) => {
							if (!this.selectCb) return;
							this.selectCb({ key: "custom", value }, e);
						});
				});
			modal.open();
		});
	}
}

/////////////////
