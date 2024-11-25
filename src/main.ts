import {
	MarkdownPreviewRenderer,
	MarkdownRenderChild,
	MarkdownRenderer,
	Menu,
	Plugin,
	ProgressBarComponent,
	setIcon,
	Setting,
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
	findKeyInsensitive,
	findKeyValueByDotNotation,
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
import { patchMarkdownPreviewRenderer } from "./monkey-patches/MarkdownPreviewRenderer";
import {
	DataviewAPI,
	DataviewLink,
	DataviewQueryResult,
} from "./libs/types/dataview";
import {
	MetadataEditor,
	PropertyEntryData,
	PropertyRenderContext,
	PropertyWidget,
} from "obsidian-typings";

const BetterPropertiesSettingsSchema = catchAndInfer(
	z.object({
		/* General */
		showResetPropertySettingWarning: z.boolean().catch(true),

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

		dataviewBP(this);
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
		return settings;
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

const dataviewBP = (plugin: BetterProperties) => {
	plugin.registerMarkdownCodeBlockProcessor(
		"dataview-bp",
		async (source, el, ctx) => {
			const mdrc = new MarkdownRenderChild(el);
			ctx.addChild(mdrc);
			const query = source;
			const { lineStart, lineEnd, text } = ctx.getSectionInfo(el) ?? {};
			if (!lineStart) {
				el.createDiv({ text: "error: no lineStart" });
				return;
			}
			const id = text?.split("\n")[lineStart].split(" ")[1];

			const dv = plugin.app.plugins
				.getPlugin("dataview")
				// @ts-ignore
				?.localApi(ctx.sourcePath, mdrc, el) as DataviewAPI | undefined;

			if (!dv) {
				el.createDiv({ text: "error: No DataviewAPI found" });
				return;
			}

			const queryResults = await dv.query(source);
			// console.log("qr: ", queryResults);

			const updateProperty = async (
				filePath: string,
				key: string,
				value: unknown
			) => {
				const file = plugin.app.vault.getFileByPath(filePath);
				if (!file) return;
				await plugin.app.fileManager.processFrontMatter(
					file,
					(fm: Record<string, unknown>) => {
						const foundKey = findKeyInsensitive(key, fm) ?? key;
						updateNestedObject(fm, foundKey, value);
					}
				);
			};

			const { tableIdColumnName } = dv.settings;

			// if (type !== 'file') return

			const renderResults = (results: DataviewQueryResult) => {
				el.empty();

				if (!results.successful) {
					el.createDiv({ text: "Query failed" });
					return;
				}

				const { headers, values, type } = results.value;

				const tableWrapper = createDiv({
					cls: "better-properties-dataview-table-wrapper markdown-source-view mod-cm6",
				});
				const table = tableWrapper.createEl("table", {
					cls: "table-editor better-properties-dataview-table",
					attr: {
						"tab-index": "-1",
					},
				});
				const tHead = table.createEl("thead");
				const tHeadRow = tHead.createEl("tr");

				let idColIndex = -1;
				const headerTypes = new Map<string, PropertyWidget<unknown>>();

				headers.forEach((h, i) => {
					const thWrapper = tHeadRow
						.createEl("th")
						.createDiv({ cls: "better-properties-dataview-table-th-wrapper" });

					const iconEl = thWrapper.createSpan();
					thWrapper.createSpan({ text: h });

					const isIdCol = h === tableIdColumnName || h === "file.link";
					// todo may false positive if aliased
					if (isIdCol) {
						idColIndex = i;
						setIcon(iconEl, "file");
						return;
					}

					const assignedType =
						plugin.app.metadataTypeManager.getAssignedType(h) ?? "text";
					const { registeredTypeWidgets } = plugin.app.metadataTypeManager;
					const assignedWidget =
						Object.values(registeredTypeWidgets).find(
							(w) => w.type === assignedType
						) ?? registeredTypeWidgets["text"];
					headerTypes.set(h, assignedWidget);

					const icon =
						plugin.getPropertySetting(h)?.general.customIcon ||
						assignedWidget.icon;
					setIcon(iconEl, icon);
				});

				const tBody = table.createEl("tbody");

				values.forEach((rowValues, rowIndex) => {
					const tr = tBody.createEl("tr");

					rowValues.forEach((itemValue, itemIndex) => {
						const td = tr.createEl("td");
						if (itemIndex === idColIndex) {
							MarkdownRenderer.render(
								plugin.app,
								itemValue?.toString() ?? "",
								td.createDiv({ cls: "metadata-input-longtext" }),
								ctx.sourcePath,
								mdrc
							);
							return;
						}

						const dotKeysArr = headers[itemIndex].split(".");
						const key = dotKeysArr[dotKeysArr.length - 1];

						const link = values[rowIndex][idColIndex];
						const filePath = link?.hasOwnProperty("path")
							? (link as DataviewLink).path
							: null;

						const widget =
							headerTypes.get(headers[itemIndex]) ??
							plugin.app.metadataTypeManager.registeredTypeWidgets["text"];

						const container = td.createDiv({ cls: "metadata-property-value" });
						widget.render(
							container,
							{
								key: key,
								type: widget.type,
								value: itemValue,
								dotKey: headers[itemIndex],
							} as PropertyEntryData<unknown>,
							{
								app: plugin.app,
								blur: () => {},
								key: key,
								metadataEditor: {
									register: (cb) => mdrc.register(cb),
								} as MetadataEditor,
								onChange: (value) =>
									filePath &&
									updateProperty(filePath, headers[itemIndex], value),
								sourcePath: ctx.sourcePath,
							}
						);
					});
				});

				el.appendChild(tableWrapper);
			};

			renderResults(queryResults);

			const onMetaChange = async () => {
				const results = await dv.query(query, ctx.sourcePath);
				renderResults(results);
			};

			plugin.app.metadataCache.on(
				"dataview:metadata-change" as "changed",
				onMetaChange
			);

			mdrc.register(() =>
				plugin.app.metadataCache.off(
					"dataview:metadata-change" as "changed",
					onMetaChange
				)
			);
		}
	);
};
