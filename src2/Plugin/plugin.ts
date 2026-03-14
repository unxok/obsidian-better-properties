import { PropertyTypeManager } from "#/PropertyTypeManager";
import { Component, Modal, Notice, Plugin } from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	BetterPropertiesSettingsTab,
} from "./settings";
import * as v from "valibot";
import { BP } from "#/lib/constants";

export class BetterProperties extends Plugin {
	async onload(): Promise<void> {
		await this.loadSettings();
		this.initComponents();
		this.addSettingTab(new BetterPropertiesSettingsTab(this));

		console.log("bp loaded3");
	}

	onunload(): void {}

	propertyTypeManager?: PropertyTypeManager;
	metadataEditorManager?: MetadataEditorManager;
	basesViewsManager?: BasesViewsManager;
	relationSyncManager?: RelationSyncManager;

	/**
	 * Initialize and attach sub component classes
	 */
	initComponents() {
		this.addChild((this.propertyTypeManager = new PropertyTypeManager(this)));
		this.addChild((this.metadataEditorManager = new MetadataEditorManager()));
		this.addChild((this.basesViewsManager = new BasesViewsManager()));
		this.addChild((this.relationSyncManager = new RelationSyncManager()));
	}

	/**
	 * The plugin settings
	 */
	private settings: BetterPropertiesSettings = v.parse(
		betterPropertiesSettingsSchema,
		{}
	);

	/**
	 * Read and parse the plugin settings from disk
	 */
	async loadSettings(): Promise<void> {
		const data: unknown = await this.loadData();

		const parsed = v.safeParse(betterPropertiesSettingsSchema, data);
		if (!parsed.success) {
			const flattenedIssues = v.flatten(parsed.issues);
			new InvalidPluginSettingsModal(this, flattenedIssues).open();
			return;
		}

		this.settings = parsed.output;
		new Notice(`${BP}: settings loaded successfully`);
	}

	/**
	 * Get the plugin settings
	 */
	getSettings(): BetterPropertiesSettings {
		return { ...this.settings };
	}

	/**
	 * Set the plugin settings and save it to disk
	 */
	async setSettings(settings: BetterPropertiesSettings): Promise<void> {
		this.settings = settings;
		await this.saveData(this.settings);
	}

	/**
	 * Update the plugin's settings and save it to disk
	 *
	 * Provide a callback which returns the new value for the settings
	 */
	updateSettings<
		T extends keyof BetterPropertiesSettings,
		K extends BetterPropertiesSettings[T]
	>(
		callback: (settings: BetterPropertiesSettings) => BetterPropertiesSettings
	): // _: undefined
	Promise<void>;

	/**
	 * Update the plugin's settings and save it to disk
	 *
	 * Specify a key and provide the value to update it with
	 */
	updateSettings<
		T extends keyof BetterPropertiesSettings,
		K extends BetterPropertiesSettings[T]
	>(key: T, value: K): Promise<void>;

	/**
	 * Update the plugin's settings and save it to disk
	 */
	async updateSettings<
		T extends keyof BetterPropertiesSettings,
		K extends BetterPropertiesSettings[T]
	>(
		key: T | ((settings: BetterPropertiesSettings) => BetterPropertiesSettings),
		value?: K
	): Promise<void> {
		if (typeof key === "function") {
			await this.setSettings(key(this.settings));
			return;
		}
		await this.setSettings({ ...this.settings, [key]: value });
	}

	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
	}
}

class MetadataEditorManager extends Component {}
class BasesViewsManager extends Component {}
class RelationSyncManager extends Component {}

class InvalidPluginSettingsModal extends Modal {
	constructor(
		public plugin: BetterProperties,
		public flattenedIssues: v.FlatErrors<undefined>
	) {
		super(plugin.app);
	}

	async onOpen(): Promise<void> {
		const { contentEl, flattenedIssues, renderIssueType } = this;
		this.setTitle(`${BP}: Invalid plugin settings`);
		contentEl.createEl("p", {
			text: `${BP} ran into the following issues when reading its settings:`,
		});

		Object.values(flattenedIssues).forEach(renderIssueType);

		contentEl.createEl("p", {
			text: "Please correct this immediately. Otherwise, your settings will be overwritten.",
			cls: "mod-warning",
		});
	}

	renderIssueType = (
		issueType: (typeof this.flattenedIssues)[keyof typeof this.flattenedIssues]
	): void => {
		const listEl = this.contentEl.createEl("ul");
		if (!issueType) return;
		if (Array.isArray(issueType)) {
			issueType.forEach((text) => {
				listEl.createEl("li", { text });
			});
			return;
		}
		Object.entries(issueType).forEach(([key, value]) => {
			listEl.createEl("li", {}, (listEl) => {
				listEl.createEl("b", { text: key });
			});
			if (!value) return;
			if (typeof value === "string") {
				listEl.createEl("li", { text: value });
				return;
			}
			const subListEl = listEl.createEl("ul");
			value.forEach((text) => {
				subListEl.createEl("li", { text });
			});
		});
	};
}
