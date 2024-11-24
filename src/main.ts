import {
	MarkdownPreviewRenderer,
	Menu,
	Plugin,
	ProgressBarComponent,
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
		const files = Object.keys(mdc)
			.map((hash) => {
				const fm = mdc[hash].frontmatter ?? {};
				if (fm?.hasOwnProperty(key)) return { hash, value: fm[key] };
				const found = findKeyInsensitive(key, fm);
				if (found) {
					return { hash, value: fm[found] };
				}
				const foundByDotKey = findKeyValueByDotNotation(key, fm);
				if (!foundByDotKey) return null;
				return { hash, value: foundByDotKey };
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
