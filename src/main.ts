import { around, dedupe } from "monkey-around";
import {
	CachedMetadata,
	Menu,
	MetadataCache,
	Plugin,
	setIcon,
	Setting,
	TFile,
	View,
	WorkspaceLeaf,
} from "obsidian";
import { monkeyAroundKey, typeWidgetPrefix } from "./libs/constants";
import {
	addUsedBy,
	addRename,
	addDelete,
	addSettings,
	addMassUpdate,
} from "./libs/utils/augmentMedataMenu";
import { registerCustomWidgets } from "./typeWidgets";
import {
	FileCacheEntry,
	MetadataCacheFileCacheRecord,
	MetadataCacheMetadataCacheRecord,
	MetadataEditor,
} from "obsidian-typings";
import {
	defaultPropertySettings,
	PropertySettings,
} from "./libs/PropertySettings";
import { addChangeIcon } from "./libs/utils/augmentMedataMenu/addChangeIcon";
import { ConfirmationModal } from "./classes/ConfirmationModal";
import { BetterPropertiesSettingTab } from "./classes/BetterPropertiesSettingTab";

type BetterPropertiesSettings = {
	propertySettings: Record<string, PropertySettings>;
	templatePropertyName: string;
	templateIdName: string;
	showSyncTemplateWarning: boolean;
};

const DEFAULT_SETTINGS: BetterPropertiesSettings = {
	propertySettings: {},
	templatePropertyName: "property-template",
	templateIdName: "property-template-id",
	showSyncTemplateWarning: true,
};

export default class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = { ...DEFAULT_SETTINGS };

	menu: Menu | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingTab(this));
		registerCustomWidgets(this);

		patchMenu(this);
		patchMetdataEditor(this);

		this.listenPropertyMenu();
	}

	onunload() {
		this.removeCustomWidgets();
	}

	setMenu(menu: Menu, property: string /*targetEl: HTMLElement*/): void {
		if (menu === this.menu) return;
		const { app } = this;
		const { metadataCache } = app;
		this.menu = menu;
		// const container = targetEl.closest(
		// 	"div.metadata-property[data-property-key]"
		// )!;
		// const key = container.getAttribute("data-property-key") ?? "";
		const key = property;

		const { metadataCache: mdc, fileCache: fc } = metadataCache;
		const fcKeys = Object.keys(fc);
		const files: { hash: string; value: unknown; path: string }[] =
			Object.keys(mdc)
				.map((hash) => {
					const fm = mdc[hash].frontmatter ?? {};
					if (!fm?.hasOwnProperty(key)) {
						// obsidian doesn't allow properties with the same name different case
						// so try to find a key without regard to letter case
						const foundKey = Object.keys(fm).find(
							(k) => k.toLowerCase() === key.toLowerCase()
						);
						if (!foundKey) return null;
						return {
							hash,
							value: fm[foundKey],
						};
					}
					return {
						hash,
						value: fm[key],
					};
				})
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
		this.registerEvent(
			this.app.workspace.on("file-property-menu", (menu, property) => {
				this.setMenu(menu, property);
			})
		);
	}

	// patchMenu(): void {
	// 	const setMenu = this.setMenu;
	// 	this.removePatch = around(Menu.prototype, {
	// 		showAtMouseEvent(old) {
	// 			return dedupe(monkeyAroundKey, old, function (e) {
	// 				// @ts-ignore Doesn't look like there's a way to get this typed correctly
	// 				const that = this as Menu;
	// 				const exit = () => {
	// 					return old.call(that, e);
	// 				};
	// 				const { target } = e;
	// 				const isHTML = target instanceof HTMLElement;
	// 				const isSVG = target instanceof SVGElement;
	// 				if (!isHTML && !isSVG) return exit();

	// 				const isExact =
	// 					target instanceof HTMLElement &&
	// 					target.tagName.toLowerCase() === "span" &&
	// 					target.classList.contains("metadata-property-icon");

	// 				const trueTarget = isExact
	// 					? target
	// 					: target.closest<HTMLElement>(
	// 							"span.metadata-property-icon"
	// 					  );

	// 				if (!trueTarget) return exit();
	// 				setMenu(that, trueTarget);

	// 				return exit();
	// 			});
	// 		},
	// 	});
	// }

	async loadSettings() {
		const loaded = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...loaded };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
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
		const existing =
			this.settings.propertySettings[lower] ?? defaultPropertySettings;
		return { ...existing };
	}

	async updatePropertySetting(
		propertyName: string,
		cb: (prev: PropertySettings) => PropertySettings
	): Promise<void> {
		const lower = propertyName.toLowerCase();
		const existing = this.settings.propertySettings[lower] ?? {
			...defaultPropertySettings,
		};
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
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!leaf.view.hasOwnProperty("metadataEditor")) return;
			const view = leaf.view as View & {
				metadataEditor: {
					onMetadataTypeChange: (lower: string) => void;
				};
			};

			// This is to force dropdowns to re-render with updated options
			// the easiest way I found was to emulate a type change
			view.metadataEditor.onMetadataTypeChange(lower);
		});
	}
}

const patchMenu = (plugin: BetterProperties) => {
	const removePatch = around(Menu.prototype, {
		showAtMouseEvent(old) {
			return dedupe(monkeyAroundKey, old, function (e) {
				// @ts-ignore Doesn't look like there's a way to get this typed correctly
				const that = this as Menu;
				const exit = () => {
					return old.call(that, e);
				};
				const { target } = e;
				const isHTML = target instanceof HTMLElement;
				const isSVG = target instanceof SVGElement;
				if (!isHTML && !isSVG) return exit();

				const isExact =
					target instanceof HTMLElement &&
					target.tagName.toLowerCase() === "span" &&
					target.classList.contains("metadata-property-icon");

				const trueTarget = isExact
					? target
					: target.closest<HTMLElement>(
							"span.metadata-property-icon"
					  );

				if (!trueTarget) return exit();

				const container = trueTarget.closest(
					"div.metadata-property[data-property-key]"
				)!;
				const property =
					container.getAttribute("data-property-key") ?? "";
				// plugin.setMenu(that, trueTarget);
				plugin.app.workspace.trigger(
					"file-property-menu",
					that,
					property
				);

				return exit();
			});
		},
	});

	plugin.register(removePatch);
};

export type PatchedMetadataEditor = MetadataEditor & {
	// toggleHiddenButton: HTMLDivElement;
	moreOptionsButton: HTMLDivElement;
	showHiddenProperties: boolean;
	toggleHiddenProperties(): void;
};

const patchMetdataEditor = (plugin: BetterProperties) => {
	const view = plugin.app.viewRegistry.viewByType["markdown"]({
		containerEl: createDiv(),
		app: plugin.app,
	} as unknown as WorkspaceLeaf);
	const MetadataEditorPrototype = Object.getPrototypeOf(
		// @ts-ignore
		view.metadataEditor
	) as PatchedMetadataEditor;

	MetadataEditorPrototype.toggleHiddenProperties = function () {
		const shouldHide = this.showHiddenProperties;
		if (shouldHide) {
			this.containerEl.style.setProperty(
				"--better-properties-hidden",
				"none"
			);
		} else {
			this.containerEl.style.setProperty(
				"--better-properties-hidden",
				"flex"
			);
		}
		this.showHiddenProperties = !shouldHide;
	};

	const removePatch = around(MetadataEditorPrototype, {
		load(old) {
			return dedupe(monkeyAroundKey, old, function () {
				// @ts-ignore
				const that = this as PatchedMetadataEditor;
				old.call(that);

				that.containerEl.style.setProperty(
					"--better-properties-hidden",
					"none"
				);
				that.showHiddenProperties = false;

				const moreOptionsButton = createDiv({
					cls: "metadata-add-button text-icon-button",
					attr: { tabIndex: 0 },
				});
				const iconEl = moreOptionsButton.createSpan({
					cls: "text-button-icon",
				});
				moreOptionsButton.createSpan({
					text: "More",
					cls: "text-button-label",
				});
				setIcon(iconEl, "more-horizontal");

				const onClickDoSync = async () => {
					const file = that.app.workspace.activeEditor?.file;
					if (!file) {
						new Notice(
							"Better Properties: No file found for metadata editor."
						);
						return;
					}
					const metaCache = that.app.metadataCache.getFileCache(file);
					if (!metaCache) {
						new Notice(
							"Better Properties: No template ID found in current file."
						);
						return;
					}
					const parsedId = getTemplateID(metaCache, plugin);
					if (!parsedId) return;
					if (!plugin.settings.showSyncTemplateWarning) {
						await doSync(metaCache, plugin, parsedId);
						return;
					}
					new SyncPropertiesModal(
						plugin,
						that,
						metaCache,
						parsedId
					).open();
				};

				moreOptionsButton.addEventListener("click", (e) => {
					new Menu()
						.addItem((item) =>
							item
								.setSection("show-hidden")
								.setTitle("Show hidden")
								.setIcon("eye-off")
								.setChecked(that.showHiddenProperties)
								.onClick(() =>
									that.toggleHiddenProperties.call(that)
								)
						)
						.addItem((item) =>
							item
								.setSection("sync-properties")
								.setTitle("Sync properties")
								.setIcon("arrow-right-left")
								.onClick(onClickDoSync)
						)
						.showAtMouseEvent(e);
				});
				that.moreOptionsButton = moreOptionsButton;
				that.addPropertyButtonEl.insertAdjacentElement(
					"afterend",
					moreOptionsButton
				);
			});
		},
	});

	plugin.register(removePatch);
};

const getTemplateID = (metaCache: CachedMetadata, plugin: BetterProperties) => {
	const {
		settings: { templateIdName },
	} = plugin;

	console.log("got template id name: ", templateIdName);

	const findLower = () => {
		const found = Object.keys(metaCache).find((key) => {
			key.toLowerCase() === templateIdName;
		});
		if (!found) return null;
		return metaCache[found as keyof typeof metaCache];
	};

	const id = metaCache?.frontmatter?.[templateIdName] ?? findLower();
	if (!id) {
		new Notice("Better Properties: No template ID found in current file.");
		return;
	}
	if (Array.isArray(id)) {
		new Notice(
			"Better Properties: Template ID is a list when it should be a single value."
		);
		return;
	}
	const parsedId: string = id.toString();
	return parsedId;
};

const doSync = async (
	// file: TFile,
	metaCache: CachedMetadata,
	plugin: BetterProperties,
	templateId: string
) => {
	const {
		settings: { templateIdName, templatePropertyName },
		app,
	} = plugin;

	// const fileFC = app.metadataCache.getFileCache(file);
	// if (!fileFC) {
	// 	new Notice("Better Properties: No template ID found in current file.");
	// 	return;
	// }

	// const parsedId = getTemplateID(fileFC, plugin)
	const parsedId = templateId;

	const templateEntries = Object.entries(metaCache.frontmatter ?? {});

	const hashes = Object.entries(app.metadataCache.metadataCache)
		.map(([hash, metadata]) => {
			if (!metadata.frontmatter) return null;
			const exactMatch = metadata.frontmatter[templatePropertyName];
			if (
				exactMatch === parsedId ||
				(Array.isArray(exactMatch) && exactMatch.includes(parsedId))
			)
				return hash;
			// try to find case insensitively
			const isMatch = Object.entries(metadata.frontmatter).some(
				([prop, value]) => {
					const a =
						prop.toLowerCase() ===
						templatePropertyName.toLowerCase();
					const b1 = value === parsedId;
					const b2 = Array.isArray(value) && value.includes(parsedId);
					const b = b1 || b2;
					return a && b;
				}
			);
			return isMatch ? hash : null;
		})
		.filter((h) => h !== null);

	const fileHashMap = new Map<string, TFile>();

	Object.entries(app.metadataCache.fileCache).forEach(([path, { hash }]) => {
		const f = app.vault.getFileByPath(path);
		if (!f) return;
		fileHashMap.set(hash, f);
	});

	let count = 0;
	await Promise.all(
		hashes.map(async (hash) => {
			const f = fileHashMap.get(hash);
			if (!f) return;
			count++;
			await app.fileManager.processFrontMatter(f, (fm) => {
				templateEntries.forEach(([prop, val]) => {
					// don't add the template id property
					if (prop === templateIdName) return;
					// if already has property, skip
					if (
						fm.hasOwnProperty(prop) ||
						fm.hasOwnProperty(prop.toLowerCase())
					)
						return;
					fm[prop] = val;
					// TODO add flag to delete or keep props not in template
				});
			});
		})
	);
	new Notice("Synchronized properties with " + count + " notes.");
};

class SyncPropertiesModal extends ConfirmationModal {
	plugin: BetterProperties;
	metadataEditor: MetadataEditor;
	// file: TFile;
	metaCache: CachedMetadata;
	templateId: string;
	constructor(
		plugin: BetterProperties,
		metadataeditor: MetadataEditor,
		// file: TFile,
		metaCache: CachedMetadata,
		templateId: string
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.metadataEditor = metadataeditor;
		// this.file = file;
		this.metaCache = metaCache;
		this.templateId = templateId;
	}

	onOpen(): void {
		const { contentEl, metaCache, plugin, templateId } = this;

		contentEl.empty();

		this.setTitle("Synchronize properties");

		contentEl.createEl("p", {
			text: "Synchronize this notes properties to others notes that match this note's property template id.",
		});
		contentEl.createEl("p", {
			text: "This will only add properties from the template, so additional properties in the target notes will be unaffected.",
		});
		this.createButtonContainer();
		this.createCheckBox({
			text: "Don't ask again",
			defaultChecked: !plugin.settings.showSyncTemplateWarning,
			onChange: async (b) =>
				plugin.updateSettings((prev) => ({
					...prev,
					showSyncTemplateWarning: !b,
				})),
		});
		this.createFooterButton((cmp) =>
			cmp.setButtonText("cancel").onClick(() => this.close())
		).createFooterButton((cmp) =>
			cmp
				.setButtonText("synchronize")
				.setCta()
				.onClick(async () => {
					await doSync(metaCache, this.plugin, templateId);
					this.close();
				})
		);
	}
}

// Might be useful later but not needed right now
// const getMetdataEditorPrototype = (app: App) => {
// 	app.workspace.onLayoutReady(() => {
// 		const leaf = app.workspace.getLeaf("tab");
// 		// const view = app.viewRegistry.viewByType["markdown"]({
// 		// 	containerEl: createDiv(),
// 		// 	app: app,
// 		// } as unknown as WorkspaceLeaf);
// 		const view = app.viewRegistry.viewByType["markdown"](leaf);
// 		const properties = app.viewRegistry.viewByType["file-properties"](leaf);
// 		const proto = Object.getPrototypeOf(
// 			// @ts-ignore
// 			view.metadataEditor
// 		) as MetadataEditor;
// 		proto._children = [];
// 		proto.owner = {
// 			getFile: () => {},
// 		} as MarkdownView;
// 		proto.addPropertyButtonEl
// 		proto.propertyListEl = createDiv();
// 		proto.containerEl = createDiv();
// 		proto.app = app;
// 		proto.save = () => {
// 			console.log("save called");
// 		};
// 		proto.properties = [{ key: "fizz", type: "text", value: "bar" }];
// 		proto.rendered = [];
// 		// proto.insertProperties({ foo: "bar" });
// 		proto.load();
// 		proto.synchronize({ foo: "bar" });
// 		const metadataEditorRow = Object.getPrototypeOf(proto.rendered[0]) as typeof proto.rendered[0];
// 		const old = metadataEditorRow.showPropertyMenu
// 		metadataEditorRow.showPropertyMenu = (e) => {
// 			console.log('hi');
// 		}
// 		console.log("properties: ", properties);
// 		console.log("view: ", view);
// 		console.log("proto: ", proto);
// 		leaf.detach();
// 	});
// };
