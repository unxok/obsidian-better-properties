import {
	App,
	CachedMetadata,
	Component,
	getLinkpath,
	MarkdownRenderChild,
	Menu,
	MetadataCache,
	Modal,
	Plugin,
	SearchComponent,
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
	findKeyInsensitive,
	findKeyValueByDotNotation,
	unsafeEval,
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
		this.metaqueryTest();
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

	metaqueryTest() {
		type Field = {
			target: "searched" | "specific";
		};
		const operators = [
			"equals",
			"doesn't equal",
			"includes",
			"doesn't include",
			"greater than",
			"less than",
		];
		type Operator = {};

		type MetaQueryConstraint = {
			leftField: string;
			operator: Operator;
			rightField?: string;
		};

		const fileParentFields = Object.keys(TFolder.prototype);
		const fileFields = Object.keys(TFile);

		console.log(fileParentFields);

		// this.registerMarkdownCodeBlockProcessor("metaquery", (source, el, ctx) => {
		// 	el.empty();

		// 	el.createEl("br");

		// 	class MetaQueryFieldSuggest extends InputSuggest<string> {
		// 		protected onRenderSuggestion(
		// 			value: string,
		// 			contentEl: HTMLDivElement,
		// 			titleEl: HTMLDivElement,
		// 			noteEl?: HTMLDivElement,
		// 			auxEl?: HTMLDivElement,
		// 			icon?: string
		// 		): void {}

		// 		protected parseSuggestion(value: string): Suggestion {
		// 			return {
		// 				title: value,
		// 			};
		// 		}

		// 		protected getSuggestions(query: string): string[] {
		// 			function getKeys(path: string): string[] {
		// 				const regex = /(?:\.|^)([a-zA-Z0-9_]+)|\["([^"]+)"\]/g;
		// 				const keys: string[] = [];
		// 				let match;

		// 				while ((match = regex.exec(path)) !== null) {
		// 					keys.push(match[1] || match[2]);
		// 				}

		// 				return keys;
		// 			}

		// 			const keys = getKeys(query);

		// 			const secondLastKey = keys.at(-2);
		// 			const lastKey = keys.at(-1);

		// 			const suggestions: Record<string, string[]> = {
		// 				frontmatter: Object.keys(
		// 					this.app.metadataTypeManager.getAllProperties()
		// 				),
		// 				metadataCache: [
		// 					"frontmatter",
		// 					"frontmatterLinks",
		// 					"headings",
		// 					"listItems",
		// 					"sections",
		// 				],
		// 				file: ["name", "basename", "path", "parent"],
		// 				parent: ["name", "path", "children"],
		// 			};

		// 			if (!lastKey) {
		// 				return ["file", "metadataCache"];
		// 			}

		// 			for (const [key, arr] of Object.entries(suggestions)) {
		// 				const isLastMatch = lastKey === key;
		// 				const isSecondLastMatch =
		// 					secondLastKey === key && !Number.isNaN(Number(lastKey));
		// 				if (!isLastMatch && !isSecondLastMatch) continue;
		// 				const lowerLast = lastKey.toLowerCase();
		// 				const lowerSecondLast = secondLastKey?.toLowerCase();
		// 				if (isLastMatch) return arr;
		// 				return arr.filter((v) => v.toLowerCase().includes(lowerLast));
		// 			}

		// 			// if (lastKey === "file") {
		// 			// 	return ["name", "basename", "path", "parent"];
		// 			// }

		// 			// if (lastKey === "parent") {
		// 			// 	return ["name", "path", "children"];
		// 			// }

		// 			// if (lastKey === "metadataCache" || secondLastKey === 'metadataCache') {
		// 			// 	const arr = [
		// 			// 		"frontmatter",
		// 			// 		"frontmatterLinks",
		// 			// 		"headings",
		// 			// 		"listItems",
		// 			// 		"sections",
		// 			// 	];
		// 			// }

		// 			// if (lastKey === "frontmatter" || secondLastKey === "frontmatter") {
		// 			// 	const lower = lastKey.toLowerCase();
		// 			// 	const allProps = Object.keys(
		// 			// 		this.app.metadataTypeManager.getAllProperties()
		// 			// 	);
		// 			// 	if (!lower || lastKey === "frontmatter") return allProps;
		// 			// 	return allProps.filter((p) => p.toLowerCase().includes(lower));
		// 			// }

		// 			return [];
		// 		}

		// 		selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		// 			const { component } = this;

		// 			const currValue = component.getValue();

		// 			const reOpen = () => {
		// 				// @ts-ignore
		// 				this.onInputChange();
		// 			};

		// 			const hasSpace = value.includes(" ");
		// 			if (!currValue) {
		// 				component.setValue(hasSpace ? `["${value}"]` : value);
		// 				component.onChanged();
		// 				console.log(this);
		// 				reOpen();
		// 				return;
		// 			}

		// 			const newValue = hasSpace ? `["${value}"]` : "." + value;
		// 			component.setValue(currValue + newValue);
		// 			component.onChanged();
		// 			console.log(this);
		// 			reOpen();
		// 		}
		// 	}

		// 	new Setting(el)
		// 		.setName("Field")
		// 		.setDesc("")
		// 		.addText((cmp) => {
		// 			new MetaQueryFieldSuggest(this.app, cmp);
		// 		});
		// });
		this.registerMarkdownCodeBlockProcessor("metaquery", (source, el, ctx) => {
			el.empty();

			const mdrc = new MarkdownRenderChild(el);
			ctx.addChild(mdrc);

			type MetaQueryContext = {
				plugin: BetterProperties;
				el: HTMLElement;
				sourcePath: string;
				component: Component;
			};

			type MetaQuery<T extends Record<string, unknown>> = {
				type: string;
				display: string;
				renderSettings: (el: HTMLElement, state: T) => void;
				getDefaultState: () => T;
				doQuery: (state: T, ctx: MetaQueryContext) => Promise<TFile[]>;
			};

			const dataviewMetaQuery: MetaQuery<{ query: string }> = {
				type: "dv",
				display: "Dataview",
				renderSettings: (el, state) => {
					el.empty();
					new Setting(el)
						.setName("Dataview query")
						.setDesc("Enter a \"LIST' Dataview query to search for notes.")
						.addTextArea((cmp) =>
							cmp
								.setPlaceholder('LIST FROM #projects WHERE status == "ongoing"')
								.setValue(state.query)
								.onChange((v) => (state.query = v))
								.then((cmp) => {
									cmp.inputEl.setAttribute("cols", "30");
									cmp.inputEl.setAttribute("rows", "3");
								})
						);
				},
				getDefaultState: () => ({ query: "" }),
				doQuery: async (state, { plugin, el, sourcePath, component }) => {
					const dv = getDataviewLocalApi(plugin, sourcePath, component, el);
					if (!dv) return [];
					const res = await dv.query(state.query);
					if (!res.successful) {
						return [];
					}
					if (res.value.type !== "list") return [];
					const links = res.value.values;
					return links
						.map(({ path }) => plugin.app.vault.getFileByPath(path))
						.filter((f) => f !== null);
				},
			};

			const javascriptMetaQuery: MetaQuery<{ code: string }> = {
				type: "js",
				display: "JavaScript",
				renderSettings: (el, state) => {
					el.empty();
					new Setting(el)
						.setName("JavaScript code")
						.setDesc(
							createFragment((el) => {
								el.createDiv({
									text: "Enter the body of a function which returns true or false for each file.",
								});
								el.createDiv().createEl("code", {
									text: "const queriedFiles = allFiles.filter(async ({file, metadata}) => {/* Your code here */})",
								});
							})
						)
						.addTextArea((cmp) =>
							cmp
								.setPlaceholder(
									'return file.path.startsWith("Projects") && metadata?.frontmatter?.status === "ongoing"'
								)
								.setValue(state.code)
								.onChange((v) => (state.code = v))
								.then((cmp) => {
									cmp.inputEl.setAttribute("cols", "30");
									cmp.inputEl.setAttribute("rows", "3");
								})
						);
				},
				getDefaultState: () => ({
					code: "",
				}),
				doQuery: async (state, { plugin }) => {
					const filterFunc = unsafeEval(
						`async (file, metadata) => {${state.code}}`
					) as (file: TFile, metadata: CachedMetadata) => Promise<boolean>;
					const queriedFiles: TFile[] = [];
					console.log("func: ", filterFunc);

					for (const [path, { hash }] of Object.entries(
						plugin.app.metadataCache.fileCache
					)) {
						const file = plugin.app.vault.getFileByPath(path);
						if (!file) continue;
						const metadata = plugin.app.metadataCache.metadataCache[hash];
						try {
							const passesFilter = !!(await filterFunc(file, metadata));
							if (!passesFilter) continue;
							queriedFiles.push(file);
						} catch (e) {
							console.error(
								"Error when running custom filter function!\n\n",
								e
							);
							continue;
						}
					}
					return queriedFiles;
				},
			};

			// const metaQueryTypes = [dataviewMetaQuery];
			const metaQueryTypesRecord = {
				dv: dataviewMetaQuery,
				js: javascriptMetaQuery,
			} as const;
			type MetaQueryTypesRecord = typeof metaQueryTypesRecord;
			type MetaQueryType = keyof MetaQueryTypesRecord;
			type MetaQueryState<T extends MetaQueryType> = ReturnType<
				MetaQueryTypesRecord[T]["getDefaultState"]
			>;

			class MetaQueryBuilder extends ConfirmationModal {
				public form: {
					queryType: MetaQueryType;
					queryTypeState: Record<
						MetaQueryType,
						ReturnType<MetaQueryTypesRecord[MetaQueryType]["getDefaultState"]>
					>;
				} = {
					queryType: "dv",
					queryTypeState: {
						dv: {
							query: "",
						},
						js: {
							code: "",
						},
					},
				};
				constructor(public ctx: MetaQueryContext) {
					super(ctx.plugin.app);
				}

				onOpen(): void {
					const { ctx, contentEl, form } = this;
					contentEl.empty();

					this.setTitle("Metadata Query Builder");

					let queryTypeContainer: HTMLElement;

					new Setting(contentEl)
						.setName("Query type")
						.setDesc("What type of query to use for search for files.")
						.then(() => {
							queryTypeContainer = contentEl.createDiv();
						})
						.addDropdown((cmp) => {
							Object.entries(metaQueryTypesRecord).forEach(
								([type, { display }]) => cmp.addOption(type, display)
							);
							cmp.onChange((v) => {
								const newQueryType = v as MetaQueryType;
								form.queryType = newQueryType;
								const queryType = metaQueryTypesRecord[newQueryType];
								queryType.renderSettings(
									queryTypeContainer,
									// @ts-ignore TODO Not sure how to type this correctly
									form.queryTypeState[v as MetaQueryType]
								);
							});
							cmp.then(() =>
								metaQueryTypesRecord[form.queryType].renderSettings(
									queryTypeContainer,
									// @ts-ignore TODO Not sure how to type this correctly
									form.queryTypeState[form.queryType]
								)
							);
						});

					this.createFooterButton((cmp) =>
						cmp.setButtonText("View form state").onClick(() => {
							const modal = new Modal(this.app);
							modal.onOpen = () => {
								modal.contentEl.empty();
								const text = JSON.stringify(form, undefined, 2);
								modal.contentEl.createEl("pre").createEl("code", { text });
							};
							modal.open();
						})
					)
						.createFooterButton((cmp) =>
							cmp.setButtonText("Test").onClick(async () => {
								const start = performance.now();
								const files = await this.doQuery();
								const end = performance.now();
								const duration = end - start;
								const modal = new Modal(this.app);
								modal.onOpen = () => {
									modal.contentEl.empty();
									modal.contentEl.createDiv({
										text: `Query took ${duration} milliseconds and retrieved ${files.length} notes.`,
									});
									const ul = modal.contentEl.createEl("ul");
									files.forEach((f) => ul.createEl("li", { text: f.path }));
								};
								modal.open();
							})
						)
						.createFooterButton((cmp) =>
							cmp.setButtonText("Save").onClick(() => this.save())
						);
				}

				async doQuery(): Promise<TFile[]> {
					const {
						form: { queryType, queryTypeState },
						ctx,
					} = this;
					const qType = metaQueryTypesRecord[queryType];
					const qState = queryTypeState[queryType];
					// @ts-ignore TODO Not sure how to type this correctly
					return await qType.doQuery(qState, ctx);
				}

				private saveCallback: (builder: this) => void = () => {};
				private save(): void {
					this.saveCallback(this);
				}

				public onSave(cb: (builder: this) => void): this {
					this.saveCallback = cb;
					return this;
				}
			}

			new MetaQueryBuilder({
				el,
				plugin: this,
				sourcePath: ctx.sourcePath,
				component: mdrc,
			}).open();
		});
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
