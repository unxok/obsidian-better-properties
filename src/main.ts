import {
	CachedMetadata,
	ColorComponent,
	Component,
	FrontMatterCache,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	Menu,
	parseYaml,
	Plugin,
	ProgressBarComponent,
	TFile,
	ValueComponent,
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
import { findKeyInsensitive } from "./libs/utils/pure";
import { patchMetdataEditor } from "./monkey-patches/MetadataEditor";
import { patchMenu } from "./monkey-patches/Menu";
import { tryParseYaml } from "./libs/utils/obsidian";
import { MetadataEditor } from "obsidian-typings";

type BetterPropertiesSettingsOld = {
	/* General */
	showResetPropertySettingWarning: boolean;
	/* Syncronization */
	propertySettings: Record<string, PropertySettings>;
	templatePropertyName: string;
	templateIdName: string;
	showSyncTemplateWarning: boolean;
};

const DEFAULT_SETTINGS_OLD: BetterPropertiesSettings = {
	propertySettings: {},
	/* General */
	showResetPropertySettingWarning: true,
	/* Syncronization */
	templatePropertyName: "property-template",
	templateIdName: "property-template-id",
	showSyncTemplateWarning: true,
};

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

const PropertyCodeBlockSchema = z.object({
	propertyName: z
		.string()
		.min(1, "Property name must be at least one character."),
	filePath: z
		.string()
		.min(1, "File path must be at least one character.")
		.optional(),
});

export default class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = BetterPropertiesSettingsSchema.parse(
		{}
	);

	menu: Menu | null = null;

	async onload() {
		this.progressTesting();
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingTab(this));
		registerCustomWidgets(this);
		patchMenu(this);
		patchMetdataEditor(this);
		this.listenPropertyMenu();
		this.rebuildLeaves();

		this.app.workspace.onLayoutReady(() => {
			this.registerMarkdownCodeBlockProcessor("property", (...args) =>
				this.propertyCodeBlock(this, ...args)
			);
		});
	}

	progressTesting() {
		this.registerMarkdownCodeBlockProcessor(
			"progress",
			(source, el, ctx) => {
				el.empty();
				const cmp = new ProgressBarComponent(el).setValue(75);
				// @ts-ignore
				const progressEl = cmp.progressBar as HTMLProgressElement;
				progressEl.addEventListener("click", (e) => {
					const { left, width } = el.getBoundingClientRect();
					const relative = Math.floor(e.clientX - left);
					const percentage = Math.floor((relative / width) * 100);
					console.log("right: ", width);
					console.log("perc: ", percentage);
					cmp.setValue(percentage);
				});
				console.log(cmp);
			}
		);
	}

	propertyCodeBlock(
		plugin: this,
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void {
		el.empty();
		const result = tryParseYaml(source);
		if (!result.success) {
			const msg =
				result.error instanceof Error
					? result.error.message
					: "unknown error";
			el.style.setProperty("color", "var(--text-error)");
			el.createDiv({ text: "Failed to parse YAML." });
			el.createDiv({ text: msg });
			return;
		}
		const parsed = PropertyCodeBlockSchema.safeParse(result.data);
		if (!parsed.success) {
			el.style.setProperty("color", "var(--text-error)");
			el.createDiv({ text: "Invalid config provided." });
			parsed.error.issues.forEach((e) => {
				el.createDiv({ text: e.path.join(", ") + ": " + e.message });
			});
			return;
		}

		const config = {
			filePath: ctx.sourcePath,
			...parsed.data,
		};
		const nameLower = config.propertyName.toLocaleLowerCase();

		const typeInfo =
			plugin.app.metadataTypeManager.getPropertyInfo(nameLower);

		const getFrontmatter = () => {
			const fileCacheRecord =
				plugin.app.metadataCache.fileCache[config.filePath];
			if (!fileCacheRecord) {
				console.log("nope: ", config.filePath);
				// deal with this
				return;
			}
			const frontmatter =
				plugin.app.metadataCache.metadataCache[fileCacheRecord.hash]
					?.frontmatter;
			return frontmatter;
		};

		const getValue = (frontmatter: FrontMatterCache) => {
			const possibleValue = frontmatter.hasOwnProperty(
				config.propertyName
			)
				? frontmatter[config.propertyName]
				: findKeyInsensitive(config.propertyName, frontmatter);
			return possibleValue ?? "";
		};

		const currentFm = getFrontmatter();
		if (!currentFm) {
			// deal with this
			return;
		}
		const currentValue = getValue(currentFm);

		const onMetadataChange = (
			file: TFile,
			_data: string,
			cache: CachedMetadata
		) => {
			const newType =
				plugin.app.metadataTypeManager.getPropertyInfo(nameLower)?.type;
			if (file.path !== config.filePath) return;
			const fm = cache.frontmatter;
			if (!fm) {
				// deal with this
				return;
			}
			const value = getValue(fm);
			if (value === currentValue) return;
			render(value, newType);
		};
		plugin.app.metadataCache.on("changed", onMetadataChange);

		const onTypeChange = (..._data: unknown[]) => {
			const newType =
				plugin.app.metadataTypeManager.getPropertyInfo(nameLower)?.type;
			if (newType === typeInfo.type) return;
			const fm = getFrontmatter();
			if (!fm) {
				// deal with this
				return;
			}
			const value = getValue(fm);
			render(value, newType);
		};

		plugin.app.metadataTypeManager.on("changed", onTypeChange);

		const mdrc = new MarkdownRenderChild(el);
		mdrc.register(() => {
			// @ts-ignore
			plugin.app.metadataCache.off("changed", onMetadataChange);
			plugin.app.metadataTypeManager.off("changed", onTypeChange);
		});

		ctx.addChild(mdrc);
		const fakeMetadataEditor: Pick<MetadataEditor, "register"> = {
			register: (cb) => {
				console.log("register called");
				mdrc.register(cb);
			},
		};

		const render = (value: unknown, type: string) => {
			el.empty();

			const widget =
				plugin.app.metadataTypeManager.registeredTypeWidgets[type] ??
				plugin.app.metadataTypeManager.registeredTypeWidgets["text"];
			widget.render(
				el,
				{
					key: config.propertyName,
					type: typeInfo.type,
					value,
				},
				{
					app: plugin.app,
					blur: () => {},
					key: config.propertyName,
					metadataEditor: fakeMetadataEditor as MetadataEditor,
					onChange: (value) => {
						console.log("value changed: ", value);
						const file = plugin.app.vault.getFileByPath(
							config.filePath
						);
						if (!file) {
							// deal with this
							console.log("no file found");
							return;
						}
						plugin.app.fileManager.processFrontMatter(
							file,
							(fm) => {
								const key = fm.hasOwnProperty(
									config.propertyName
								)
									? config.propertyName
									: findKeyInsensitive(
											config.propertyName,
											fm
									  ) ?? config.propertyName;
								fm[key] = value;
							}
						);
					},
					sourcePath:
						plugin.app.workspace.activeEditor?.file?.path ?? "",
				}
			);
		};

		render(currentValue, typeInfo.type);
		console.log("parsed: ", parsed.data);
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
		const files = Object.keys(mdc)
			.map((hash) => {
				const fm = mdc[hash].frontmatter ?? {};
				if (fm?.hasOwnProperty(key)) return { hash, value: fm[key] };
				const found = findKeyInsensitive(key, fm);
				if (!found) return null;
				return { hash, value: fm[found] };
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
