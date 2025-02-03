import {
	App,
	CachedMetadata,
	Component,
	DropdownComponent,
	ExtraButtonComponent,
	getLinkpath,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	Menu,
	MetadataCache,
	Modal,
	Plugin,
	SearchComponent,
	setIcon,
	Setting,
	setTooltip,
	stringifyYaml,
	TextComponent,
	TFile,
	TFolder,
	View,
} from "obsidian";
import { monkeyAroundKey, typeWidgetPrefix } from "./libs/constants";
import {
	addUsedBy,
	addRename,
	addDelete,
	addSettings,
	addMassUpdate,
} from "./augmentMedataMenu";
import { registerCustomWidgets } from "./typeWidgets";
import {
	defaultPropertySettings,
	PropertySettings,
	PropertySettingsSchema,
} from "./PropertySettings";
import { addChangeIcon } from "./augmentMedataMenu/addChangeIcon";
import { BetterPropertiesSettingTab } from "./classes/BetterPropertiesSettingTab";
import { z } from "zod";
import { catchAndInfer } from "./libs/utils/zod";
import {
	arrayMove,
	clampNumber,
	findKeyInsensitive,
	findKeyValueByDotNotation,
	toNumberNotNaN,
	tryEval,
	unsafeEval,
	updateNestedObject,
} from "./libs/utils/pure";
import { patchMetdataEditor } from "./monkey-patches/MetadataEditor";
import { patchMenu } from "./monkey-patches/Menu";
import {
	createInlineCodePlugin,
	createPostProcessInlinePropertyEditor,
} from "./classes/InlineCodeWidget";
import { insertPropertyEditor, propertyCodeBlock } from "./PropertyRenderer";
import { patchMetdataCache } from "./monkey-patches/MetadataCache";
import { ListComponent, TextListComponent } from "./classes/ListComponent";
import { processDataviewWrapperBlock } from "./DataviewWrapper";
import { SidebarModal } from "./classes/SidebarModal";
import {
	PropertySuggest,
	PropertySuggestModal,
} from "./classes/PropertySuggest";
import { PropertySettingsModal } from "./augmentMedataMenu/addSettings";
import { patchModal } from "./monkey-patches/Modal";
import { InputSuggest, Suggestion } from "./classes/InputSuggest";
import { getDataviewLocalApi } from "./libs/utils/dataview";
import { ConfirmationModal } from "./classes/ConfirmationModal";
import {
	MetadataCacheMetadataCacheRecord,
	MetadataEditor,
	PropertyEntryData,
	PropertyRenderContext,
} from "obsidian-typings";
import {
	compareFunc,
	createInternalLinkEl,
	getGlobalBlockSuggestions,
	getGlobalHeadingSuggestions,
	tryParseYaml,
} from "./libs/utils/obsidian";
import { obsidianText } from "./i18Next/defaultObsidian";
import { createDragHandle } from "./libs/utils/drag";
import { FileSuggest } from "./classes/FileSuggest";
import { around, dedupe } from "monkey-around";
import { FolderSuggest } from "./classes/FolderSuggest";

const BetterPropertiesSettingsSchema = catchAndInfer(
	z.object({
		/* General */
		showResetPropertySettingWarning: z.boolean().catch(true),
		metadataLabelWidth: z.number().catch(NaN),

		/* Synchronization */
		propertySettings: z.record(PropertySettingsSchema).catch({}),
		templatePropertyName: z.string().catch("property-template"),
		templateIdName: z.string().catch("property-template-id"),
		showSyncTemplateWarning: z.boolean().catch(true),
	})
);

type BetterPropertiesSettings = z.infer<typeof BetterPropertiesSettingsSchema>;

export default class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = BetterPropertiesSettingsSchema.parse({});

	menu: Menu | null = null;

	async onload() {
		patchModal(this);

		this.registerEditorExtension([createInlineCodePlugin(this)]);
		this.listTesting();
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingTab(this));
		registerCustomWidgets(this);
		patchMenu(this);
		patchMetdataEditor(this);
		patchMetdataCache(this);
		// patchMarkdownPreviewRenderer(this);
		// patchAbstractInputSuggest(this);
		this.listenPropertyMenu();
		this.rebuildLeaves();

		this.addCommand(insertPropertyEditor);

		this.registerMarkdownCodeBlockProcessor("property", (...args) =>
			propertyCodeBlock(this, ...args)
		);
		this.registerMarkdownPostProcessor(
			createPostProcessInlinePropertyEditor(this)
		);

		// dataviewBP(this);
		this.registerMarkdownCodeBlockProcessor("dataview-bp", (...args) =>
			processDataviewWrapperBlock(this, ...args)
		);
		this.registerMetaView();

		this.addCommand({
			id: "Open settings for a property",
			name: "Open settings for a property",
			callback: () => {
				new PropertySuggestModal(this.app, (data) => {
					new PropertySettingsModal(this, data.property).open();
				}).open();
			},
		});
	}

	registerMetaView() {
		this.registerMarkdownCodeBlockProcessor(
			"metaview",
			async (source, el, ctx) => {
				const mdrc = new MarkdownRenderChild(el);
				ctx.addChild(mdrc);
				renderView({
					plugin: this,
					mdrc,
					source,
					el,
					ctx,
				});
			}
		);
	}

	listTesting() {
		this.registerMarkdownCodeBlockProcessor("list", (_source, el, _ctx) => {
			el.empty();
			new Setting(el)
				.setName("List testing")
				.setDesc("Testing out the ListComponent")
				.addText((cmp) => cmp.setPlaceholder("this is for spacing"));

			new Setting(el).setName("List example").setDesc("some description");

			new TextListComponent(el.createDiv(), "empty")
				.createNewItemButton()
				.setValue(["apples", "oranges", "bananas"]);
		});
	}

	onunload() {
		this.removeCustomWidgets();
	}

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			// @ts-expect-error Private API not documented in obsidian-typings
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	setMenu(menu: Menu, property: string /*targetEl: HTMLElement*/): void {
		if (menu === this.menu) return;
		const { app } = this;
		const { metadataCache } = app;
		this.menu = menu;
		const key = property;

		const { metadataCache: mdc, fileCache: fc } = metadataCache;
		const fcKeys = Object.keys(fc);
		const preFiles = Object.keys(mdc).map((hash) => {
			const fm = mdc[hash].frontmatter ?? {};
			if (fm?.hasOwnProperty(key)) return { hash, value: fm[key] };
			const found = findKeyInsensitive(key, fm);
			if (found) {
				return { hash, value: fm[found] };
			}
			if (!fm) return null;
			const foundByDotKey = findKeyValueByDotNotation(key, fm);
			if (!foundByDotKey) return null;
			return { hash, value: foundByDotKey };
		});

		const files = preFiles
			.filter((o) => o !== null)
			.map((obj) => {
				const path = fcKeys.find((k) => fc[k].hash === obj.hash)!;
				return { ...obj, path };
			})
			.filter(({ path }) => !!path);

		const commonProps = { plugin: this, menu, files, key };
		addChangeIcon(commonProps);
		addUsedBy(commonProps);
		addRename(commonProps);
		addMassUpdate(commonProps);
		addSettings(commonProps);
		addDelete(commonProps);
	}

	listenPropertyMenu(): void {
		5;
		this.registerEvent(
			this.app.workspace.on("file-property-menu", (menu, property) => {
				this.setMenu(menu, property);
			})
		);
	}

	async onExternalSettingsChange() {
		await this.loadSettings();
	}

	async loadSettings() {
		const loaded = await this.loadData();
		const parsed = BetterPropertiesSettingsSchema.parse(loaded);
		this.settings = parsed;
	}

	async saveSettings(): Promise<void> {
		const parsed = BetterPropertiesSettingsSchema.parse(this.settings);
		await this.saveData(parsed);
	}

	async updateSettings(
		cb: (prev: BetterPropertiesSettings) => BetterPropertiesSettings
	): Promise<void> {
		const newSettings = cb(this.settings);
		this.settings = { ...newSettings };
		await this.saveSettings();
	}

	getPropertySetting(propertyName: string): PropertySettings {
		const lower = propertyName.toLowerCase();
		const settings =
			this.settings.propertySettings[lower] ?? defaultPropertySettings;
		return { ...settings };
	}

	async updatePropertySetting(
		propertyName: string,
		cb: (prev: PropertySettings) => PropertySettings
	): Promise<void> {
		const lower = propertyName.toLowerCase();
		const existing = this.getPropertySetting(lower);
		const newSettings = cb(existing);
		return await this.updateSettings((prev) => ({
			...prev,
			propertySettings: {
				...prev.propertySettings,
				[lower]: {
					...newSettings,
				},
			},
		}));
	}

	removeCustomWidgets(): void {
		const mtm = this.app.metadataTypeManager;
		Object.keys(mtm.registeredTypeWidgets).forEach((key) => {
			if (!key.startsWith(typeWidgetPrefix)) return;
			delete mtm.registeredTypeWidgets[key];
		});
	}

	refreshPropertyEditor(property: string): void {
		const lower = property.toLowerCase();
		const withoutDots = lower.split(".")[0];
		this.app.metadataTypeManager.trigger("changed", lower);
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!leaf.view.hasOwnProperty("metadataEditor")) return;
			const view = leaf.view as View & {
				metadataEditor: {
					onMetadataTypeChange: (propName: string) => void;
				};
			};

			// This is to force dropdowns to re-render with updated options
			// the easiest way I found was to emulate a type change
			view.metadataEditor.onMetadataTypeChange(withoutDots);
		});
	}
}

//////////////////////////////////////////////////////////////

type FileItem = { file: TFile; metadata: CachedMetadata | null };

// type Filter = (file: TFile, metadata: CachedMetadata | null) => boolean;
type Filter = {
	label: string;
} & (
	| (Pick<Field, "type" | "value"> & { operator: string })
	| {
			type: "custom";
			func: string;
	  }
);
// type Sorter = (a: FileItem, b: FileItem) => number;
type Sorter = {
	asc: boolean;
	label: string;
} & (
	| Pick<Field, "type" | "value">
	| {
			type: "custom";
			func: string;
	  }
);
type PropertyField = {
	type: "property";
	alias: string;
	colWidth?: number;
	value: string;
};

const fileDataColumnValueOptions = [
	"file-link",
	"file-name",
	"file-path",
	"file-created",
	"file-modified",
	"file-size",
] as const;

type FileDataField = {
	type: "fileData";
	alias: string;
	colWidth?: number;
	value: (typeof fileDataColumnValueOptions)[number];
};
type TagsField = {
	type: "tags";
	alias: string;
	colWidth?: number;
	value: string;
};
type EmbedField = {
	type: "embed";
	alias: string;
	colWidth?: number;
	value: string;
	embedType: "heading" | "block";
};
type Field = PropertyField | FileDataField | TagsField | EmbedField;

type BlockConfig = {
	fields: Field[];
	filters: Filter[];
	folder: string;
	excludedFolders: string[];
	sorter: Sorter;
	pageNumber: number;
	pageSize: number;
};

type SaveBlockConfig = (b: BlockConfig) => Promise<void>;

const openConfigurationModal = ({
	plugin,
	blockConfig,
	saveBlockConfig,
}: {
	plugin: BetterProperties;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
}) => {
	const modal = new ConfirmationModal(plugin.app);
	const form = { ...blockConfig };

	modal.onClose = async () => {
		await saveBlockConfig(form);
	};

	modal.onOpen = () => {
		const { contentEl } = modal;
		contentEl.empty();
		modal.setTitle("MetaView Configuration");

		new Setting(contentEl)
			.setName("Fields")
			.setDesc(
				"The fields of data that will be displayed for each queried note. Only property and embed fields are editable!"
			);
		const fieldsContainer = contentEl.createDiv();
		new FieldListComponent(
			plugin.app,
			fieldsContainer,
			{ type: "fileData", alias: "", value: "" as FileDataField["value"] },
			form.fields
		)
			.renderItems()
			.createNewItemButton()
			.createSortAlphabetical()
			.onChange((arr) => (form.fields = [...arr]));

		new Setting(contentEl)
			.setName("Folder")
			.setDesc(
				"Choose a folder to query notes from. If blank, all folders will be searched. Subfolders are included!"
			)
			.addSearch((cmp) => {
				cmp.setValue(form.folder);
				cmp.onChange((v) => (form.folder = v));
				new FolderSuggest(plugin.app, cmp);
			});

		new Setting(contentEl)
			.setName("Excluded Folders")
			.setDesc(
				"Set specific folders to exclude notes within them from the query. Includes Subfolders!"
			);
		const excludedFoldersContainer = contentEl.createDiv();
		new FolderListComponent(
			plugin.app,
			excludedFoldersContainer,
			"",
			form.excludedFolders
		)
			.renderItems()
			.createNewItemButton()
			.createSortAlphabetical()
			.onChange((arr) => (form.excludedFolders = [...arr]));

		new Setting(contentEl)
			.setName("Page size")
			.setDesc(
				"The number of results to show at a time. Set to 0 for no limit."
			)
			.addText((cmp) =>
				cmp
					.setValue(form.pageSize.toString())
					.onChange((v) => (form.pageSize = toNumberNotNaN(v)))
			);

		modal.createFooterButton((cmp) =>
			cmp.setButtonText("close").onClick(() => modal.close())
		);
		modal.createFooterButton((cmp) =>
			cmp.setButtonText("form data").onClick(() => {
				const m = new Modal(modal.app);
				m.onOpen = () => {
					m.contentEl.empty();
					m.contentEl
						.createEl("pre")
						.createEl("code", { text: JSON.stringify(form, undefined, 2) });
				};
				m.open();
			})
		);
	};

	modal.open();
};

class FieldListComponent extends ListComponent<Field> {
	constructor(
		private app: App,
		containerEl: HTMLElement,
		defaultItemValue: Field,
		items?: Field[]
	) {
		super(containerEl, defaultItemValue, items);
	}

	renderItem(
		fieldValue: Field,
		setting: Setting,
		index: number,
		shouldFocus: boolean
	): void {
		const { app } = this;
		const { controlEl } = setting;
		const { type, value, alias } = fieldValue;
		controlEl.classList.add(
			"better-properties-metaview-configuration-fields-item"
		);
		controlEl.appendChild(
			createDragHandle({
				containerEl: setting.settingEl,
				index,
				items: this.items,
				itemsContainerEl: this.itemsContainerEl,
				onDragEnd: (items, from, to) =>
					this.setValueHighlight(arrayMove(items, from, to), to),
				dragStyle: "indicator",
			})
		);
		const fieldTypeOptions: Record<Field["type"], string> = {
			fileData: "File data",
			property: "Property",
			tags: "Tags",
			embed: "Embed",
		};

		const renderFieldValueText = (fieldType: Field["type"]) => {
			const onChange = (v: string) =>
				this.updateItemValue(
					(oldValue) => ({ ...oldValue, value: v } as Field),
					index
				);
			const cmp = new TextComponent(setting.controlEl)
				.setValue(value)
				.onChange(onChange)
				.then((cmp) => {
					setTooltip(cmp.inputEl, "Field value");
					if (fieldType === "fileData") {
						new FileDataSuggest(app, cmp);
						cmp.setPlaceholder("");
					} else if (fieldType === "property") {
						new PropertySuggest(app, cmp);
						cmp.setPlaceholder("");
					} else if (fieldType === "embed") {
						new EmbedSuggest(app, cmp);
						cmp.setPlaceholder("#Some heading *or* ^some-block-id");
					} else {
						// tags doesn't use value
						cmp.setPlaceholder("").setDisabled(true);
						cmp.inputEl.classList.add("better-properties-mod-disabled");
						setTooltip(
							cmp.inputEl,
							'The "Tags" field doesn\'t use a field value'
						);
					}

					cmp.inputEl.classList.add(
						"better-properties-text-list-component-input"
					);
					if (!shouldFocus) return;
					cmp.inputEl.focus();
				});
			return cmp;
		};

		let fieldValueText: TextComponent;
		new DropdownComponent(controlEl)
			.addOptions(fieldTypeOptions)
			.setValue(type)
			.onChange((v) => {
				const newValue = v as Field["type"];
				this.updateItemValue(
					(oldValue) => ({ ...oldValue, type: newValue } as Field),
					index
				);
				const cmp = renderFieldValueText(newValue);
				cmp.setValue("");
				fieldValueText.inputEl.replaceWith(cmp.inputEl);
				fieldValueText = cmp;
			})
			.then((cmp) => setTooltip(cmp.selectEl, "Field type"));

		fieldValueText = renderFieldValueText(type);

		new TextComponent(controlEl)
			.setValue(alias)
			.onChange((v) =>
				this.updateItemValue((old) => ({ ...old, alias: v }), index)
			)
			.then((cmp) => {
				setTooltip(cmp.inputEl, "Field alias");
			});

		// TODO set up additional options
		// new ExtraButtonComponent(controlEl)
		// 	.setIcon('settings')
		// 	.setTooltip("Additional options")
		// 	.onClick(() => {
		// 		const modal = new Modal(app);
		// 		modal.onOpen = () => {
		// 			const {contentEl} = modal;
		// 			contentEl.empty();
		// 			new Setting(contentEl)
		// 				.setName("")
		// 		}
		// 	})

		// this.addMoveUpButton(setting, index);
		// this.addMoveDownButton(setting, index);
		this.addDeleteButton(setting, index);
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
								.setTitle("Field value (A to Z)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(a.value, b.value))
									)
								)
						)
						.addItem((item) =>
							item
								.setTitle("Field value (Z to A)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(b.value, a.value))
									)
								)
						)
						.showAtMouseEvent(e);
				})
		);
		return this;
	}
}

class FolderListComponent extends ListComponent<string> {
	constructor(
		private app: App,
		containerEl: HTMLElement,
		defaultItemValue: string,
		items?: string[]
	) {
		super(containerEl, defaultItemValue, items);
	}

	renderItem(
		value: string,
		setting: Setting,
		index: number,
		shouldFocus: boolean
	): void {
		setting.controlEl.appendChild(
			createDragHandle({
				containerEl: setting.settingEl,
				index,
				items: this.items,
				itemsContainerEl: this.itemsContainerEl,
				onDragEnd: (items, from, to) =>
					this.setValueHighlight(arrayMove(items, from, to), to),
				dragStyle: "indicator",
			})
		);
		new SearchComponent(setting.controlEl)
			.setValue(value)
			.onChange((v) => this.updateItemValue(v, index))
			.then((cmp) => {
				new FolderSuggest(this.app, cmp);
				cmp.inputEl.classList.add(
					"better-properties-text-list-component-input"
				);
				if (!shouldFocus) return;
				cmp.inputEl.focus();
			});
		// this.addMoveUpButton(setting, index);
		// this.addMoveDownButton(setting, index);
		this.addDeleteButton(setting, index);
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
								.setTitle("Folder name (A to Z)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(a, b))
									)
								)
						)
						.addItem((item) =>
							item
								.setTitle("Folder name (Z to A)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(b, a))
									)
								)
						)
						.showAtMouseEvent(e);
				})
		);
		return this;
	}
}

class EmbedSuggest extends InputSuggest<{ subpath: string; level?: number }> {
	getHeadings(query: string): { subpath: string; level?: number }[] {
		const lowerQuery = query.toLowerCase();
		const discarded = new Set<string>();
		const included = new Map<string, { subpath: string; level?: number }>();

		Object.values(this.app.metadataCache.metadataCache).forEach((meta) => {
			meta.headings?.forEach(({ heading, level }) => {
				if (discarded.has(heading) || included.has(heading)) return;
				// NOT case sensitive
				if (!heading.toLowerCase().includes(lowerQuery)) {
					discarded.add(heading);
					return;
				}
				included.set(heading, { subpath: heading, level });
			});
		});

		return Array.from(included.values());
	}

	getBlocks(query: string): { subpath: string; level?: number }[] {
		const discarded = new Set<string>();
		const included = new Map<string, { subpath: string; level?: number }>();

		Object.values(this.app.metadataCache.metadataCache).forEach((meta) => {
			if (!meta.blocks) return;
			Object.keys(meta.blocks).forEach((id) => {
				if (discarded.has(id) || included.has(id)) return;
				// IS case sensitive
				if (!id.includes(query)) {
					discarded.add(id);
					return;
				}
				included.set(id, { subpath: id });
			});
		});

		return Array.from(included.values());
	}

	protected getSuggestions(
		query: string
	): { subpath: string; level?: number }[] {
		if (!query) return [];
		const char = query.charAt(0);
		const trueQuery = query.slice(1);
		if (!(char === "#" || char === "^")) return [];
		const arr =
			char === "#" ? this.getHeadings(trueQuery) : this.getBlocks(trueQuery);
		return arr;
	}

	protected parseSuggestion(value: {
		subpath: string;
		level?: number;
	}): Suggestion {
		return {
			title: value.subpath,
			aux: value.level !== undefined ? "H" + value.level : undefined,
		};
	}

	protected onRenderSuggestion(): void {}

	selectSuggestion(
		value: { subpath: string; level?: number },
		evt: MouseEvent | KeyboardEvent
	): void {
		const prefix = value.level === undefined ? "^" : "#";
		this.component.setValue(prefix + value.subpath);
		this.component.onChanged();
	}
}

class FileDataSuggest extends InputSuggest<string> {
	protected getSuggestions(query: string): string[] | Promise<string[]> {
		const suggestions = [...fileDataColumnValueOptions];
		if (!query) return suggestions;
		return suggestions.filter((s) => s.includes(query));
	}

	protected parseSuggestion(value: string): Suggestion {
		return {
			title: value,
		};
	}

	protected onRenderSuggestion(): void {}

	selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
		this.component.setValue(value);
		this.component.onChanged();
	}
}

type ParseBlockConfig = (source: string) => BlockConfig;
const parseBlockConfig: ParseBlockConfig = (source) => {
	const defaultConfig: BlockConfig = {
		fields: [],
		filters: [],
		folder: "",
		excludedFolders: [],
		sorter: {
			asc: true,
			type: "fileData",
			value: "file-name" as FileDataField["value"],
			label: "By file name (A to Z)",
		},
		pageNumber: 1,
		pageSize: 10,
	};

	const parsed = tryParseYaml(source);
	if (!parsed.success) {
		console.log("Failed to parse YAML block config... reverting to default");
		return { ...defaultConfig };
	}
	return { ...defaultConfig, ...(parsed.data as BlockConfig) };
};

const renderView = ({
	plugin,
	mdrc,
	el,
	source,
	ctx,
}: {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	source: string;
	el: HTMLElement;
	ctx: MarkdownPostProcessorContext;
}) => {
	const saveBlockConfig = async (newConfig: BlockConfig) => {
		const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
		if (!file) {
			console.error(
				"Failed to update block. File not found at: ",
				ctx.sourcePath
			);
			return;
		}
		const stringified = stringifyYaml(newConfig);
		const chars = stringified.split("");
		// stringifyYaml adds an extra new line character at the end of the string
		chars.pop();
		const finalStr = chars.join("");
		await plugin.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const info = ctx.getSectionInfo(el);
			if (!info) {
				console.error(
					`Failed to update block. Section info returned null.\nctx: ${ctx}\nel: ${el}`
				);
				return content;
			}
			const { lineStart, lineEnd } = info;
			const start = lineStart + 1;
			lines.splice(start, lineEnd - start, finalStr);
			const newContent = lines.join("\n");
			return newContent;
		});
	};

	replaceEditBlockButton(el.parentElement!, (e, existingButton) => {
		const menu = new Menu()
			.addItem((item) =>
				item
					.setIcon("code-2")
					.setTitle(obsidianText("interface.menu.edit"))
					.onClick(() => existingButton.click())
			)
			.addItem((item) =>
				item
					.setIcon("settings")
					.setTitle("Configure")
					.onClick(() =>
						openConfigurationModal({ plugin, blockConfig, saveBlockConfig })
					)
			);

		menu.showAtMouseEvent(e);
	});

	const items: FileItem[] = [];

	const blockConfig = parseBlockConfig(source);
	const {
		fields,
		filters,
		folder,
		excludedFolders,
		sorter,
		pageNumber,
		pageSize,
	} = blockConfig;

	if (!fields.length) {
		return renderBlankView(el, () =>
			openConfigurationModal({ plugin, blockConfig, saveBlockConfig })
		);
	}

	const {
		app: { vault, metadataCache },
	} = plugin;
	const allFiles = vault.getMarkdownFiles();

	const { tableHeadRowEl, tableBodyEl, containerEl, bottomToolbarEl } =
		createInitialEls();
	renderHeaders({ plugin, tableHeadRowEl, blockConfig, saveBlockConfig });
	addMatchingItems({
		items,
		allFiles,
		metadataCache,
		filters,
		folder,
		excludedFolders,
	});
	items.sort(parseSorter(sorter));
	const paginatedItems = getPaginatedItems(items, pageNumber, pageSize);
	renderRows({
		plugin,
		mdrc,
		ctx,
		paginatedItems,
		tableBodyEl,
		fields,
	});

	const getTotalPages = (pageSize: number, totalItems: number) => {
		if (pageSize <= 0) return 1;
		return Math.ceil(totalItems / pageSize);
	};

	const createToolbar = (
		toolbarEl: HTMLElement,
		pageNumber: number,
		pageSize: number,
		totalItems: number
	) => {
		const totalPages = getTotalPages(pageSize, totalItems);
		const getResultsText = () => {
			if (pageSize <= 0) return totalItems + " results";
			const start = (pageNumber - 1) * pageSize;
			const end = Math.min(totalItems, pageNumber * pageSize);
			return `${start + 1} - ${end} of ${totalItems} results`;
		};

		const navigate = async (page: number) => {
			blockConfig.pageNumber = page;
			await saveBlockConfig(blockConfig);
		};

		toolbarEl.createSpan({ text: getResultsText(), cls: "clickable-icon" });
		const paginationContainer = toolbarEl.createDiv({
			cls: "better-properties-metaview-pagination-container",
		});
		paginationContainer.createSpan(
			{
				cls: "clickable-icon",
			},
			(el) => {
				setIcon(el, "chevron-first");
				setTooltip(el, "First");
				el.addEventListener("click", async () => await navigate(1));
			}
		);
		paginationContainer.createSpan(
			{
				cls: "clickable-icon",
			},
			(el) => {
				setIcon(el, "chevron-left");
				setTooltip(el, "Previous");
				el.addEventListener(
					"click",
					async () => await navigate(Math.max(1, pageNumber - 1))
				);
			}
		);
		paginationContainer.createSpan({
			text: pageNumber.toString(),
			cls: "clickable-icon",
		});
		paginationContainer.createSpan({
			text: "of",
			cls: "clickable-icon mod-non-interactive",
		});
		paginationContainer.createSpan({
			text: totalPages.toString(),
			cls: "clickable-icon mod-non-interactive",
		});
		paginationContainer.createSpan({ cls: "clickable-icon" }, (el) => {
			setIcon(el, "chevron-right");
			setTooltip(el, "Next");
			el.addEventListener(
				"click",
				async () => await navigate(Math.min(totalPages, pageNumber + 1))
			);
		});
		paginationContainer.createSpan({ cls: "clickable-icon" }, (el) => {
			setIcon(el, "chevron-last");
			setTooltip(el, "Last");
			el.addEventListener("click", async () => await navigate(totalPages));
		});
	};

	createToolbar(bottomToolbarEl, pageNumber, pageSize, items.length);

	el.empty();
	el.appendChild(containerEl);
};

type ParseSorter = (sorter: Sorter) => (a: FileItem, b: FileItem) => number;
const parseSorter: ParseSorter = (sorter) => {
	if (sorter.type === "custom") {
		const parsed = tryEval(sorter.func);
		if (parsed.success) {
			console.log("eval result: ", parsed.result);
			return parsed.result as () => number;
		}
		console.error(parsed.error);
		return () => 0;
	}

	// TODO parse for other types
	return () => 0;
};

type ParseFilter = (
	filter: Filter
) => (file: TFile, metadata: CachedMetadata | null) => boolean;
const parseFilter: ParseFilter = (filter) => {
	if (filter.type === "custom") {
		const parsed = tryEval(filter.func);
		if (parsed.success) {
			return parsed.result as () => boolean;
		}
		console.error(parsed.error);
		return () => true;
	}

	// TODO parse for other types
	return () => true;
};

const renderBlankView = (el: HTMLElement, btnCallback: () => void) => {
	const container = el.createDiv({
		cls: "better-properties-metaview-blank-container",
	});
	container.createEl("h4", {
		text: "MetaView",
		cls: "better-properties-metaview-blank-container-title",
	});
	const descEl = container.createDiv({
		cls: "better-properties-metaview-blank-container-desc",
	});
	descEl.createDiv({ text: "Click the button below to get started!" });
	descEl.createDiv({
		text: 'Click the "settings" button for this block for more options.',
	});
	container
		.createDiv({
			cls: "better-properties-metaview-blank-container-btn-container",
		})
		.createEl("button", {
			text: "Configure view",
			cls: "better-properties-metaview-blank-container-btn",
		})
		.addEventListener("click", btnCallback);

	container.createEl("a", {
		text: "docs",
		// TODO link to specific section
		href: "https://github.com/unxok/obsidian-better-properties",
	});
	container.createEl("br");
};

const createInitialEls = () => {
	const containerEl = createDiv({
		cls: "better-properties-metaview-container",
	});
	const contentEl = containerEl.createDiv({
		cls: "better-properties-metaview-content",
	});
	const bottomToolbarEl = containerEl.createDiv({
		cls: "better-properties-metaview-toolbar",
	});
	const tableEl = contentEl.createEl("table", {
		cls: "better-properties-metaview-table",
	});
	const tableHeadEl = tableEl.createEl("thead", {
		cls: "better-properties-metaview-table-head",
	});
	const tableHeadRowEl = tableHeadEl.createEl("tr", {
		cls: "better-properties-metaview-table-head-row",
	});
	const tableBodyEl = tableEl.createEl("tbody", {
		cls: "better-properties-metaview-table-body",
	});
	return {
		containerEl,
		contentEl,
		bottomToolbarEl,
		tableEl,
		tableHeadEl,
		tableHeadRowEl,
		tableBodyEl,
	};
};

const renderHeaders = ({
	plugin,
	tableHeadRowEl,
	blockConfig,
	saveBlockConfig,
}: {
	plugin: BetterProperties;
	tableHeadRowEl: HTMLElement;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
}) => {
	const { fields } = blockConfig;
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		const display = field.alias
			? field.alias
			: field.type === "tags"
			? "tags"
			: field.value;
		const th = tableHeadRowEl.createEl("th", {
			cls: "better-properties-metaview-table-header",
		});

		const setColWidthVar = (n: number) => {
			th.style.setProperty("--col-width", n + "px");
		};

		if (field.colWidth) {
			const n = toNumberNotNaN(field.colWidth, 1);
			setColWidthVar(n < 0 ? 0 : n);
		}

		th.createDiv(
			{
				cls: "better-properties-metaview-table-resizer",
			},
			(el) => {
				el.addEventListener("dblclick", () => {
					delete field.colWidth;
					saveBlockConfig(blockConfig);
				});

				el.addEventListener("mousedown", (e) => {
					el.classList.add("better-properties-mod-is-dragging");
					let lastPos = e.clientX;
					let lastWidth = field.colWidth ?? th.getBoundingClientRect().width;
					const onMouseMove = (e: MouseEvent) => {
						const diff = e.clientX - lastPos;
						lastWidth += diff;
						setColWidthVar(lastWidth < 0 ? 0 : lastWidth);
						lastPos = e.clientX;
					};
					const onMouseUp = async (e: MouseEvent) => {
						el.classList.remove("better-properties-mod-is-dragging");
						field.colWidth = lastWidth;
						await saveBlockConfig(blockConfig);
						document.removeEventListener("mousemove", onMouseMove);
						document.removeEventListener("mouseup", onMouseUp);
					};

					document.addEventListener("mousemove", onMouseMove);
					document.addEventListener("mouseup", onMouseUp);
				});
			}
		);
		const wrapper = th.createDiv({
			cls: "better-properties-metaview-table-header-wrapper",
		});
		const iconEl = wrapper.createSpan({
			cls: "better-properties-metaview-table-header-icon",
		});
		setIcon(iconEl, getIconName(plugin, field));
		wrapper.createSpan({
			text: display,
			cls: "better-properties-metaview-table-header-name",
		});
	}
};

const getIconName = (plugin: BetterProperties, col: Field) => {
	if (col.type === "fileData") return "file";
	if (col.type === "property") {
		const customIcon = plugin.getPropertySetting(col.value)?.general
			?.customIcon;
		if (customIcon) return customIcon;
		const assignedType = plugin.app.metadataTypeManager.getAssignedType(
			col.value
		);
		if (!assignedType) return "text";
		const defaultIcon =
			plugin.app.metadataTypeManager.registeredTypeWidgets[assignedType]?.icon;
		return defaultIcon ?? "text";
	}
	if (col.type === "tags") return "tags";
	return "hash";
};

const addMatchingItems = ({
	items,
	allFiles,
	metadataCache,
	filters,
	folder,
	excludedFolders,
}: {
	items: { file: TFile; metadata: CachedMetadata | null }[];
	allFiles: TFile[];
	metadataCache: MetadataCache;
	filters: Filter[];
	folder: string;
	excludedFolders: string[];
}) => {
	for (let i = 0; i < allFiles.length; i++) {
		const file = allFiles[i];
		const { path } = file;
		// don't add if not in specified folder
		if (folder && !path.startsWith(folder)) continue;
		// don't add if in an excluded folder
		if (
			excludedFolders.length &&
			excludedFolders.some((exFolder) => path.startsWith(exFolder))
		) {
			continue;
		}

		const metadata = metadataCache.getFileCache(file);
		const hasFailedFilter = filters.some(
			(filter) => !parseFilter(filter)(file, metadata)
		);
		// don't add if one of the filters returns false
		if (hasFailedFilter) continue;

		items.push({
			file,
			metadata,
		});
	}
};

const getPaginatedItems = (
	items: FileItem[],
	pageNumber: number,
	pageSize: number
) => {
	if (pageSize <= 0) return items;
	const truePageSize = Math.floor(pageSize);
	// unneccessary +/- 1's are for sake of readability
	const pageIndex = clampNumber(pageNumber - 1, 0, Number.MAX_SAFE_INTEGER);
	const startingResultIndex = pageIndex * truePageSize;
	const endingResultIndex = (pageIndex + 1) * truePageSize - 1;
	return items.slice(startingResultIndex, endingResultIndex + 1);
};

const renderRows = ({
	plugin,
	mdrc,
	ctx,
	paginatedItems,
	tableBodyEl,
	fields,
}: {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	ctx: MarkdownPostProcessorContext;
	paginatedItems: FileItem[];
	tableBodyEl: HTMLElement;
	fields: Field[];
}) => {
	for (let i = 0; i < paginatedItems.length; i++) {
		const item = paginatedItems[i];
		const tr = tableBodyEl.createEl("tr", {
			cls: "better-properties-metaview-table-row",
		});
		fields.forEach((col) => {
			const td = tr.createEl("td", {
				cls: "better-properties-metaview-table-cell",
			});
			const wrapperEl = td.createDiv({
				cls: "better-properties-metaview-table-cell-wrapper",
			});
			renderCell({
				plugin,
				mdrc,
				ctx,
				wrapperEl,
				item,
				col,
			});
		});
	}
};

type RenderCellArgs<T extends Field = Field> = {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	ctx: MarkdownPostProcessorContext;
	wrapperEl: HTMLElement;
	item: FileItem;
	col: T;
};
const renderCell = (args: RenderCellArgs) => {
	switch (args.col.type) {
		case "fileData":
			return renderFileDataCell(args as RenderCellArgs<FileDataField>);
		case "property":
			return renderPropertyCell(args as RenderCellArgs<PropertyField>);
		case "tags":
			return renderTagsCell(args as RenderCellArgs<TagsField>);
	}
};

const renderFileDataCell = ({
	wrapperEl,
	item: { file },
	col,
}: RenderCellArgs<FileDataField>) => {
	wrapperEl.classList.add("mod-filedata");
	switch (col.value) {
		case "file-link":
			return wrapperEl.appendChild(createInternalLinkEl(file));
		case "file-name":
			return (wrapperEl.textContent = file.basename);
		case "file-created":
			return (wrapperEl.textContent = new Date(
				file.stat.ctime
			).toLocaleString());
		case "file-modified":
			return (wrapperEl.textContent = new Date(
				file.stat.mtime
			).toLocaleString());
		case "file-path":
			return (wrapperEl.textContent = file.path);
		case "file-size":
			return (wrapperEl.textContent = file.stat.size + " bytes");
	}
};

const renderPropertyCell = ({
	plugin,
	mdrc,
	ctx,
	col,
	item: { file, metadata },
	wrapperEl,
}: RenderCellArgs<PropertyField>) => {
	const {
		app: { metadataTypeManager, fileManager },
	} = plugin;

	const fm = metadata?.frontmatter ?? {};

	const dotKeys = col.value.split(".");
	const propertyKey = dotKeys[dotKeys.length - 1];
	const propertyKeyWithDots = col.value;
	const foundKey = findKeyInsensitive(propertyKey, fm) ?? propertyKey;
	const propertyValue = fm[foundKey] ?? null;

	const updateProperty = async (value: unknown) => {
		await fileManager.processFrontMatter(file, (fm) => {
			if (col.value.includes(".")) {
				return updateNestedObject(fm, propertyKeyWithDots, value);
			}
			fm[foundKey] = value;
		});
	};

	const assignedType =
		metadataTypeManager.getAssignedType(propertyKey) ?? "text";
	const widget = metadataTypeManager.registeredTypeWidgets[assignedType];
	widget.render(
		wrapperEl,
		{
			key: propertyKey,
			type: assignedType,
			value: propertyValue,
			dotKey: propertyKeyWithDots,
		} as PropertyEntryData<unknown>,
		{
			app: plugin.app,
			blur: () => {},
			key: propertyKey,
			dotKey: propertyKeyWithDots,
			metadataEditor: {
				register: (cb) => mdrc.register(cb),
			} as MetadataEditor,
			onChange: async (v) => await updateProperty(v),
			sourcePath: ctx.sourcePath,
		} as PropertyRenderContext
	);
};

const renderTagsCell = ({
	col,
	item: { metadata },
	wrapperEl,
}: RenderCellArgs<TagsField>) => {
	const tagContainer = wrapperEl.createDiv({
		cls: "better-properties-metaview-tags-container",
	});
	if (!metadata?.tags?.length) return;
	const uniqueTags = new Set(metadata.tags.map(({ tag }) => tag));
	uniqueTags.forEach((tag) => {
		tagContainer.createSpan().createEl("a", {
			text: tag,
			href: tag,
			cls: "tag",
			attr: {
				target: "_blank",
				rel: "noopener nofollow",
			},
		});
	});
};

const replaceEditBlockButton = (
	el: HTMLElement,
	openMenu: (e: MouseEvent, existingButton: HTMLElement) => void
) => {
	window.setTimeout(() => {
		const newButton = createDiv({
			cls: "edit-block-button",
			attr: {
				"aria-label": "Configure metaview",
			},
		});
		const existingButton = el.querySelector(
			"div.edit-block-button"
		) as HTMLElement | null;
		if (!existingButton) {
			throw new Error("Could not find 'edit block button' div");
		}
		newButton.addEventListener("click", (e) => openMenu(e, existingButton));

		setIcon(newButton, "settings");

		existingButton.style.setProperty("display", "none");
		existingButton.insertAdjacentElement("afterend", newButton);
	}, 0);
};
