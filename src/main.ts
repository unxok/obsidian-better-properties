import { Menu, Plugin, View } from "obsidian";
import { typeWidgetPrefix } from "./libs/constants";
import {
	addUsedBy,
	addRename,
	addDelete,
	addSettings,
	addMassUpdate,
} from "./libs/utils/augmentMedataMenu";
import { registerCustomWidgets } from "./typeWidgets";
import {
	defaultPropertySettings,
	PropertySettings,
	PropertySettingsSchema,
} from "./libs/PropertySettings";
import { addChangeIcon } from "./libs/utils/augmentMedataMenu/addChangeIcon";
import { BetterPropertiesSettingTab } from "./classes/BetterPropertiesSettingTab";
import { z } from "zod";
import { catchAndInfer } from "./libs/utils/zod";
import { findKeyInsensitive } from "./libs/utils/pure";
import { patchMetdataEditor } from "./libs/utils/monkey-patches/MetadataEditor";
import { patchMenu } from "./libs/utils/monkey-patches/MetadataEditor/Menu";

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

export default class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = BetterPropertiesSettingsSchema.parse(
		{}
	);

	menu: Menu | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingTab(this));
		registerCustomWidgets(this);
		patchMenu(this);
		patchMetdataEditor(this);
		this.listenPropertyMenu();
		this.rebuildLeaves();
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
