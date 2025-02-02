import {
	App,
	CachedMetadata,
	Component,
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
	TextComponent,
	TFile,
	TFolder,
	View,
} from "obsidian";
import { typeWidgetPrefix } from "./libs/constants";
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
	clampNumber,
	findKeyInsensitive,
	findKeyValueByDotNotation,
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
import { TextListComponent } from "./classes/ListComponent";
import { processDataviewWrapperBlock } from "./DataviewWrapper";
import { SidebarModal } from "./classes/SidebarModal";
import { PropertySuggestModal } from "./classes/PropertySuggest";
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
import { compareFunc, createInternalLinkEl } from "./libs/utils/obsidian";
import { obsidianText } from "./i18Next/defaultObsidian";

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
				el.empty();
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

type Filter = (file: TFile, metadata: CachedMetadata | null) => boolean;
type FileItem = { file: TFile; metadata: CachedMetadata | null };
type Sorter = (a: FileItem, b: FileItem) => number;
type PropertyColumn = {
	type: "property";
	alias: string;
	colWidth?: number;
	value: string;
};
type FileDataColumn = {
	type: "fileData";
	alias: string;
	colWidth?: number;
	value:
		| "file-link"
		| "file-name"
		| "file-path"
		| "file-created"
		| "file-modified"
		| "file-size";
};
type TagsColumn = {
	type: "tags";
	alias: string;
	colWidth?: number;
	value: string;
};
type EmbedColumn = {
	type: "embed";
	alias: string;
	colWidth?: number;
	value: string;
	embedType: "heading" | "block";
};
type ColumnAccessor =
	| PropertyColumn
	| FileDataColumn
	| TagsColumn
	| EmbedColumn;

type BlockConfig = {
	columnAccessors: ColumnAccessor[];
	filters: Filter[];
	folder: string;
	excludedFolders: string[];
	sorter: Sorter;
	pageNumber: number;
	pageSize: number;
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
	replaceEditBlockButton(el.parentElement!);

	const items: FileItem[] = [];

	// TODO parse from source
	const blockConfig: BlockConfig = {
		columnAccessors: [
			{ type: "fileData", alias: "", value: "file-link" },
			{ type: "tags", alias: "Body tags", value: "" },
			{ type: "property", alias: "Property tags", value: "tags" },
		],
		filters: [],
		folder: "02 Projects",
		excludedFolders: [],
		sorter: (a, b) => compareFunc(a.file.basename, b.file.basename),
		pageNumber: 1,
		pageSize: 10,
	};

	const {
		columnAccessors,
		filters,
		folder,
		excludedFolders,
		sorter,
		pageNumber,
		pageSize,
	} = blockConfig;

	const {
		app: { vault, metadataCache },
	} = plugin;
	const allFiles = vault.getMarkdownFiles();

	const { tableHeadRowEl, tableBodyEl, containerEl } = createInitialEls();
	renderHeaders(plugin, columnAccessors, tableHeadRowEl);
	addMatchingItems({
		items,
		allFiles,
		metadataCache,
		filters,
		folder,
		excludedFolders,
	});
	items.sort(sorter);
	console.log("filtered and sorted: ", items);
	const paginatedItems = getPaginatedItems(items, pageNumber, pageSize);
	console.log("paginated: ", paginatedItems);
	renderRows({
		plugin,
		mdrc,
		ctx,
		paginatedItems,
		tableBodyEl,
		columnAccessors,
	});

	el.empty();
	el.appendChild(containerEl);
	console.log("container: ", containerEl);
};

const createInitialEls = () => {
	const containerEl = createDiv({
		cls: "better-properties-metaview-container",
	});
	const contentEl = containerEl.createDiv({
		cls: "better-properties-metaview-content",
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
		tableEl,
		tableHeadEl,
		tableHeadRowEl,
		tableBodyEl,
	};
};

const renderHeaders = (
	plugin: BetterProperties,
	columnAccessors: ColumnAccessor[],
	tableHeadRowEl: HTMLElement
) => {
	for (let i = 0; i < columnAccessors.length; i++) {
		const col = columnAccessors[i];
		const display = col.alias
			? col.alias
			: col.type === "tags"
			? "tags"
			: col.value;
		const th = tableHeadRowEl.createEl("th", {
			cls: "better-properties-metaview-table-header",
		});
		const wrapper = th.createDiv({
			cls: "better-properties-metaview-table-header-wrapper",
		});
		const iconEl = wrapper.createSpan({
			cls: "better-properties-metaview-table-header-icon",
		});
		setIcon(iconEl, getIconName(plugin, col));
		wrapper.createSpan({
			text: display,
			cls: "better-properties-metaview-table-header-name",
		});
	}
};

const getIconName = (plugin: BetterProperties, col: ColumnAccessor) => {
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
		const hasFailedFilter = filters.some((filter) => !filter(file, metadata));
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
	columnAccessors,
}: {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	ctx: MarkdownPostProcessorContext;
	paginatedItems: FileItem[];
	tableBodyEl: HTMLElement;
	columnAccessors: ColumnAccessor[];
}) => {
	for (let i = 0; i < paginatedItems.length; i++) {
		const item = paginatedItems[i];
		const tr = tableBodyEl.createEl("tr", {
			cls: "better-properties-metaview-table-row",
		});
		columnAccessors.forEach((col) => {
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

type RenderCellArgs<T extends ColumnAccessor = ColumnAccessor> = {
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
			return renderFileDataCell(args as RenderCellArgs<FileDataColumn>);
		case "property":
			return renderPropertyCell(args as RenderCellArgs<PropertyColumn>);
		case "tags":
			return renderTagsCell(args as RenderCellArgs<TagsColumn>);
	}
};

const renderFileDataCell = ({
	wrapperEl,
	item: { file },
	col,
}: RenderCellArgs<FileDataColumn>) => {
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
}: RenderCellArgs<PropertyColumn>) => {
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
}: RenderCellArgs<TagsColumn>) => {
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

const replaceEditBlockButton = (el: HTMLElement) => {
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
		newButton.addEventListener("click", (e) => {
			const menu = new Menu().addItem((item) =>
				item
					.setIcon("code-2")
					.setTitle(obsidianText("plugins.properties.action-edit"))
					.onClick(() => existingButton.click())
			);

			menu.showAtMouseEvent(e);
		});

		setIcon(newButton, "settings");

		existingButton.style.setProperty("display", "none");
		existingButton.insertAdjacentElement("afterend", newButton);
	}, 0);
};
