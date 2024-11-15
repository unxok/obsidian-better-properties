import {
	AbstractInputSuggest,
	App,
	ColorComponent,
	DropdownComponent,
	Keymap,
	Menu,
	Modal,
	SearchComponent,
	setIcon,
	Setting,
	TextComponent,
	TFile,
} from "obsidian";
import {
	defaultPropertySettings,
	PropertySettings,
	PropertySettingsSchema,
} from "@/PropertySettings";
import BetterProperties from "@/main";
import { CustomTypeWidget } from "..";
import { arrayMove, dangerousEval } from "@/libs/utils/pure";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { TextColorComponent } from "@/classes/TextColorComponent";
import { ListComponent } from "@/classes/ListComponent";
import { obsidianText } from "@/i18Next/defaultObsidian";

export const DropdownWidget: CustomTypeWidget = {
	type: "dropdown",
	icon: "chevron-down-circle",
	default: () => "",
	name: () => text("typeWidgets.dropdown.name"),
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, data, ctx) => {
		const { options, dynamicFileJs, dynamicInlineJs } = plugin.settings
			.propertySettings[data.key.toLowerCase()]?.["dropdown"] ?? {
			...defaultPropertySettings["dropdown"],
		};

		// const container = el.createDiv({
		// 	cls: "metadata-input-longtext better-properties-dropdown-container",
		// });
		const container = el;

		const dropdown = new DropdownComponent(container);

		const linkButton = container.createSpan({
			cls: "clickable-icon",
			attr: {
				"aria-label": text("typeWidgets.dropdown.openNoteTooltip"),
			},
		});

		const updateLinkButton = (dropdownValue: string) => {
			if (dropdownValue.startsWith("[[") && dropdownValue.endsWith("]]")) {
				const linkText = dropdownValue.slice(2, -2);
				const withoutPipe = (() => {
					let pipe = -1;
					while ((pipe = linkText.indexOf("|", pipe + 1)) >= 0) {
						if (pipe > 0 && linkText[pipe - 1] == "\\") continue;
						return linkText.substring(0, pipe);
					}
					return linkText.replace(/\\\|/g, "|");
				})();
				linkButton.style.setProperty("display", "flex");
				linkButton.onclick = async (e) => {
					const paneType = Keymap.isModEvent(e);
					await plugin.app.workspace.openLinkText(withoutPipe, "", paneType);
				};
				return;
			}
			linkButton.style.setProperty("display", "none");
			linkButton.onclick = () => {};
		};

		setIcon(linkButton, "link");
		updateLinkButton(data.value?.toString() ?? "");

		const optionMap = new Map<string, (typeof options)[0]>();

		const applyConfig = (v: string) => {
			const data = optionMap.get(v);
			if (!data) return;
			const {
				config: { backgroundColor, textColor },
			} = data;
			// console.log("got data: ", data);
			if (backgroundColor) {
				dropdown.selectEl.style.setProperty(
					"background-color",
					backgroundColor
				);
			} else {
				dropdown.selectEl.style.removeProperty("background-color");
			}
			if (textColor) {
				dropdown.selectEl.style.setProperty("color", textColor);
			} else {
				dropdown.selectEl.style.removeProperty("color");
			}
		};

		dropdown.onChange((v) => {
			ctx.onChange(v);
			updateLinkButton(v);
			applyConfig(v);
		});

		(async () => {
			const staticOptionsObj = options.reduce((acc, data) => {
				const {
					value,
					config: { label },
				} = data;
				acc[value] = label || value;
				optionMap.set(value, data);
				return acc;
			}, {} as Record<string, string>);

			const optionsObjWithInline = await getDynamicOptionsInline(
				dynamicInlineJs,
				staticOptionsObj
			);

			const optionsObj = await getDynamicOptionsFile(
				dynamicFileJs,
				optionsObjWithInline,
				plugin
			);

			dropdown.addOptions(optionsObj).setValue(data.value?.toString() ?? "");

			applyConfig(data.value?.toString() ?? "");
		})();
	},
};

const getDynamicOptionsInline = async (
	inlineJs: string,
	obj: Record<string, string>
) => {
	if (!inlineJs) return obj;
	try {
		const func = dangerousEval(`async () => {${inlineJs}}`) as () => Promise<
			PropertySettings["dropdown"]["options"]
		>;
		const dynamicArr = await func();
		const parsed = PropertySettingsSchema.removeCatch()
			.shape.dropdown.removeCatch()
			.shape.options.parse(dynamicArr);
		if (!Array.isArray(dynamicArr)) throw new Error();
		return parsed.reduce(
			(acc, { value, config: { label } }) => {
				acc[value] = label || value;
				return acc;
			},
			{ ...obj }
		);
	} catch (e) {
		console.error(e);
		return obj;
	}
};

const getDynamicOptionsFile = async (
	filePath: string,
	obj: Record<string, string>,
	plugin: BetterProperties
) => {
	if (!filePath || !filePath?.toLowerCase()?.endsWith(".js")) return obj;
	const file = plugin.app.vault.getFileByPath(filePath);
	if (!file) {
		new Notice(text("notices.couldntLocateJsFile", { filePath }));
		return obj;
	}
	const inlineJs = await plugin.app.vault.cachedRead(file);
	return getDynamicOptionsInline(inlineJs, obj);
};

export const createDropdownSettings = (
	el: HTMLElement,
	form: PropertySettings["dropdown"],
	updateForm: <T extends keyof PropertySettings["dropdown"]>(
		key: T,
		value: PropertySettings["dropdown"][T]
	) => void,
	plugin: BetterProperties
	// defaultOpen: boolean
) => {
	const { content } = createSection(
		el,
		text("typeWidgets.dropdown.name"),
		true
	);

	// const updateOptions = (
	// 	cb: (prev: (typeof form)["options"]) => (typeof form)["options"]
	// ) => {
	// 	const newOpts = cb([...form.options]);
	// 	updateForm("options", newOpts);
	// };

	new Setting(content)
		.setHeading()
		.setName(text("typeWidgets.dropdown.settings.options.title"))
		.setDesc(text("typeWidgets.dropdown.settings.options.desc"));

	const defaultOption: Option = {
		value: "",
		config: {
			label: "",
			backgroundColor: "",
			textColor: "",
		},
	};

	const optionContainer = content.createDiv();

	new OptionList(
		optionContainer,
		{ ...defaultOption },
		[...form.options],
		plugin
	).onChange((v) => {
		console.log("changed: ", v);
		updateForm("options", [...v]);
	});

	// const renderOptions = () => {
	// 	optionContainer.empty();
	// 	form.options.forEach((data, index) =>
	// 		createOption(
	// 			optionContainer,
	// 			updateOptions,
	// 			renderOptions,
	// 			data,
	// 			index,
	// 			plugin
	// 		)
	// 	);
	// };

	// renderOptions();

	// new Setting(content).addButton((cmp) =>
	// 	cmp
	// 		.setCta()
	// 		.setIcon("plus")
	// 		.onClick(() => {
	// 			const newOpts = [...form.options];
	// 			const defaultData: PropertySettings["dropdown"]["options"][0] =
	// 				{
	// 					value: "",
	// 					config: {
	// 						label: "",
	// 						backgroundColor: "",
	// 						textColor: "",
	// 					},
	// 				};
	// 			const newLen = newOpts.push({ ...defaultData });
	// 			createOption(
	// 				optionContainer,
	// 				updateOptions,
	// 				renderOptions,
	// 				{ ...defaultData },
	// 				newLen - 1,
	// 				plugin
	// 			);
	// 			updateForm("options", newOpts);
	// 		})
	// );

	new Setting(content)
		.setHeading()
		.setName(text("typeWidgets.dropdown.settings.dynamicOptions.title"))
		.setDesc(text("typeWidgets.dropdown.settings.dynamicOptions.desc"));

	new Setting(content)
		.setName(
			text("typeWidgets.dropdown.settings.dynamicOptions.inlineJs.title")
		)
		.addTextArea((cmp) =>
			cmp
				.setPlaceholder(
					text(
						"typeWidgets.dropdown.settings.dynamicOptions.inlineJs.placeholder"
					)
				)
				.setValue(form.dynamicInlineJs)
				.onChange((v) => updateForm("dynamicInlineJs", v))
				.then((cmp) => {
					cmp.inputEl.setAttribute("rows", "4");
				})
		);

	new Setting(content)
		.setName(text("typeWidgets.dropdown.settings.dynamicOptions.fileJs.title"))
		.addSearch((cmp) => {
			cmp
				.setPlaceholder(
					text(
						"typeWidgets.dropdown.settings.dynamicOptions.fileJs.placeholder"
					)
				)
				.setValue(form.dynamicFileJs)
				.onChange((v) => updateForm("dynamicFileJs", v));
			new JsSuggest(plugin.app, cmp);
		});
};

const createOption = (
	container: HTMLElement,
	updateOptions: (
		cb: (
			prev: PropertySettings["dropdown"]["options"]
		) => PropertySettings["dropdown"]["options"]
	) => void,
	renderOptions: () => void,
	data: PropertySettings["dropdown"]["options"][0],
	index: number,
	plugin: BetterProperties
) => {
	const { value } = data;
	const setting = new Setting(container);

	// don't need this
	setting.infoEl.remove();

	setting
		.addText((cmp) =>
			cmp
				.setPlaceholder(
					text("typeWidgets.dropdown.createOption.value.placeholder")
				)
				.setValue(value)
				.onChange((v) => {
					updateOptions((prev) => {
						prev[index].value = v;
						return prev;
					});
				})
				.then((c) => {
					c.inputEl.setAttribute(
						"aria-label",
						text("typeWidgets.dropdown.createOption.value.tooltip")
					);
					c.inputEl.classList.add("better-properties-dropdown-setting-input");
				})
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("chevron-up")
				.onClick(() => {
					if (index === 0) return;
					updateOptions((prev) => {
						const newArr = arrayMove(prev, index, index - 1);
						return newArr;
					});
					renderOptions();
				})
				.setTooltip(text("typeWidgets.dropdown.createOption.moveUpTooltip"))
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("chevron-down")
				.onClick(() => {
					updateOptions((prev) => {
						if (prev.length === index + 1) return prev;
						const newArr = arrayMove(prev, index, index + 1);
						return newArr;
					});
					renderOptions();
				})
				.setTooltip(text("typeWidgets.dropdown.createOption.moveDownTooltip"))
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("settings")
				.onClick(() => {
					const modal = new OptionConfigModal(
						plugin.app,
						data
						// (cb: (prev: typeof data) => typeof data) =>
						// 	updateOptions((prev) => {
						// 		prev[index] = cb(prev[index]);
						// 		return [...prev];
						// 	})
					);

					modal.onClose = () => renderOptions();

					modal.open();
				})
				.setTooltip("Configuration")
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("x")
				.onClick(() => {
					setting.settingEl.remove();
					updateOptions((prev) => {
						const arr = prev.filter((_, i) => i !== index);
						return arr;
					});
					renderOptions();
				})
				.setTooltip(text("typeWidgets.dropdown.createOption.removeTooltip"))
		);
};

class JsSuggest extends AbstractInputSuggest<TFile> {
	searchCmp: SearchComponent;
	constructor(app: App, searchCmp: SearchComponent) {
		super(app, searchCmp.inputEl);
		this.searchCmp = searchCmp;
	}

	protected getSuggestions(query: string): TFile[] | Promise<TFile[]> {
		const allFiles = this.app.vault.getFiles();
		const jsFiles = allFiles
			.filter((f) => f.extension.toLowerCase() === "js")
			.toSorted((a, b) => b.path.localeCompare(a.path));
		if (!query) return jsFiles;
		const filtered = jsFiles.filter((f) => f.path.includes(query));
		return filtered;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.classList.add("mod-complex");
		const contentEl = el.createDiv({ cls: "suggestion-content" });
		contentEl.createDiv({ cls: "suggestion-title", text: file.name });
		contentEl.createDiv({ cls: "suggestion-note", text: file.path });
	}

	selectSuggestion(file: TFile, _: MouseEvent | KeyboardEvent): void {
		this.searchCmp.setValue(file.path);
		this.searchCmp.onChanged();
		this.close();
	}
}

class OptionConfigModal extends Modal {
	option: PropertySettings["dropdown"]["options"][0];
	// updateOption: (
	// 	cb: (prev: OptionConfigModal["option"]) => OptionConfigModal["option"]
	// ) => void;

	constructor(
		app: App,
		option: OptionConfigModal["option"]
		// updateConfig: OptionConfigModal["updateOption"]
	) {
		super(app);
		this.option = { ...option };
		// this.updateOption = updateConfig;
	}

	updateConfig<
		T extends keyof PropertySettings["dropdown"]["options"][0]["config"]
	>(key: T, value: PropertySettings["dropdown"]["options"][0]["config"][T]) {
		this.option["config"][key] = value;
	}

	onOpen(): void {
		const { contentEl, option } = this;
		contentEl.empty();

		this.setTitle(text("typeWidgets.dropdown.createOption.configModal.title"));

		new Setting(contentEl)
			.setName(
				text(
					"typeWidgets.dropdown.createOption.configModal.settings.labelSetting.title"
				)
			)
			.setDesc(
				text(
					"typeWidgets.dropdown.createOption.configModal.settings.labelSetting.desc"
				)
			)
			.addText((cmp) =>
				cmp.setValue(option.config.label).onChange((v) => {
					this.updateConfig("label", v);
					// this.updateOption((prev) => ({
					// 	...prev,
					// 	config: { ...prev.config, label: v },
					// }));
				})
			);

		new Setting(contentEl)
			.setName(
				text(
					"typeWidgets.dropdown.createOption.configModal.settings.backgroundColorSetting.title"
				)
			)
			.setDesc(
				text(
					"typeWidgets.dropdown.createOption.configModal.settings.backgroundColorSetting.desc"
				)
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(option.config.backgroundColor)
					.onChange(
						(v) => this.updateConfig("backgroundColor", v)
						// this.updateOption((prev) => ({
						// 	...prev,
						// 	config: { ...prev.config, backgroundColor: v },
						// }))
					)
			);

		new Setting(contentEl)
			.setName(
				text(
					"typeWidgets.dropdown.createOption.configModal.settings.textColorSetting.title"
				)
			)
			.setDesc(
				text(
					"typeWidgets.dropdown.createOption.configModal.settings.textColorSetting.desc"
				)
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(option.config.textColor)
					.onChange(
						(v) => this.updateConfig("textColor", v)
						// this.updateOption((prev) => ({
						// 	...prev,
						// 	config: { ...prev.config, textColor: v },
						// }))
					)
			);
	}
}

type Option = PropertySettings["dropdown"]["options"][0];

class OptionList extends ListComponent<Option> {
	constructor(
		containerEl: HTMLElement,
		defaultItemValue: Option,
		options: Option[],
		public plugin: BetterProperties
	) {
		super(containerEl, defaultItemValue, [...options]);

		this.createSortAlphabetical().createNewItemButton();
	}
	renderItem({ value, config }: Option, setting: Setting, index: number): void {
		this.addDragHandle(setting, index);
		new TextComponent(setting.controlEl)
			.setValue(value)
			.onChange((v) =>
				this.updateItemValue((prev) => ({ ...prev, value: v }), index)
			)
			.inputEl.classList.add("better-properties-text-list-component-input");
		this.addMoveUpButton(setting, index);
		this.addMoveDownButton(setting, index);
		this.addConfigureButton({ value, config }, setting, index);
		this.addDeleteButton(setting, index);
	}

	addConfigureButton(value: Option, setting: Setting, index: number): this {
		setting.addExtraButton((cmp) =>
			cmp
				.setIcon("settings")
				.setTooltip(obsidianText("interface.settings"))
				.onClick(() => {
					const modal = new OptionConfigModal(this.plugin.app, value);

					modal.onClose = () => {
						this.updateItemValue({ ...modal.option }, index);
					};

					modal.open();
				})
		);
		return this;
	}

	public createSortAlphabetical(): this {
		this.toolbarSetting.addButton((cmp) =>
			cmp
				.setIcon("sort-asc")
				.setClass("clickable-icon")
				.setTooltip(obsidianText("plugins.file-explorer.action-change-sort"))
				.onClick((e) => {
					new Menu()
						.addItem((item) =>
							item
								.setTitle(
									obsidianText("plugins.file-explorer.label-sort-a-to-z")
								)
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) =>
											a.value.localeCompare(b.value)
										)
									)
								)
						)
						.addItem((item) =>
							item
								.setTitle(
									obsidianText("plugins.file-explorer.label-sort-z-to-a")
								)
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) =>
											b.value.localeCompare(a.value)
										)
									)
								)
						)
						.showAtMouseEvent(e);
				})
		);
		return this;
	}
}
