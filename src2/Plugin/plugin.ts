import { PropertyTypeManager } from "#/Plugin/managers/PropertyTypeManager";
import {
	App,
	Component,
	Menu,
	MenuItem,
	Plugin,
	PluginManifest,
} from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	BetterPropertiesSettingsTab,
} from "./settings";
import * as v from "valibot";
import { InvalidPluginSettingsModal } from "./invalidPluginSettingsModal";
import "./index.css";
import { BaseUtilityManager } from "./managers/BaseUtilityManager";
import { PropertyLinkManager } from "./managers/PropertyLinkManager";
import { around, dedupe } from "monkey-around";
import { monkeyAroundKey } from "~/lib/constants";
import { FormulaSyncManager } from "./managers/FormulaSyncManager";

export class BetterProperties extends Plugin {
	propertyTypeManager: PropertyTypeManager;
	propertyLinkManager: PropertyLinkManager;
	baseUtilityManager: BaseUtilityManager;
	propertiesEditorManager: PropertiesEditorManager;
	basesViewsManager: BasesViewsManager;
	formulaSyncManager: FormulaSyncManager;
	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		// the order of these managers being loaded matters, so use caution when re-ordering
		this.addChild((this.propertyTypeManager = new PropertyTypeManager(this)));
		this.addChild((this.propertyLinkManager = new PropertyLinkManager(this)));
		this.addChild((this.baseUtilityManager = new BaseUtilityManager(this)));
		this.addChild(
			(this.propertiesEditorManager = new PropertiesEditorManager(this))
		);
		this.addChild((this.basesViewsManager = new BasesViewsManager()));
		this.addChild((this.formulaSyncManager = new FormulaSyncManager(this)));
	}

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingsTab(this));

		// REMOVE FOR PROD BUILD
		this.rebuildLeaves();
	}

	onunload(): void {}

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves(async (leaf) => {
			await leaf.rebuildView();
		});
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
	updateSettings(
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

	onFileEvent(cb: () => void | Promise<void>): void {
		const { vault, metadataCache } = this.app;
		const eventRefs = [
			vault.on("create", cb),
			vault.on("delete", cb),
			vault.on("modify", cb),
			vault.on("rename", cb),
			metadataCache.on("changed", cb),
		];
		eventRefs.forEach((ref) => this.registerEvent(ref));
	}
}

class PropertiesEditorManager extends Component {
	constructor(public plugin: BetterProperties) {
		super();
	}

	onload(): void {
		this.patchMenu();
	}

	onunload(): void {}

	patchMenu(): void {
		const manager = this;

		const uninstaller = around(Menu.prototype, {
			showAtMouseEvent(old) {
				return dedupe(monkeyAroundKey, old, function (e) {
					// @ts-expect-error
					const that = this as Menu;

					const exit = () => {
						return old.call(that, e);
					};
					const { currentTarget } = e;
					const isMetadataPropertyIcon =
						currentTarget instanceof HTMLElement &&
						currentTarget.tagName.toLowerCase() === "span" &&
						currentTarget.classList.contains("metadata-property-icon");

					if (!isMetadataPropertyIcon) return exit();

					const container = currentTarget.closest(
						"div.metadata-property[data-property-key]"
					)!;
					const property = container.getAttribute("data-property-key") ?? "";

					manager.modifyPropertyEditorMenu(that, property);

					return exit();
				});
			},
		});

		this.register(uninstaller);
	}

	modifyPropertyEditorMenu(menu: Menu, property: string): void {
		const changeTypeItem = menu.items[0];
		if (changeTypeItem instanceof MenuItem) {
			changeTypeItem.setSection("action.changeType");
		}

		const section = "action.z_better-properties";
		menu.addItem((item) => {
			item
				.setSection(section)
				.setIcon("lucide-settings")
				.setTitle("Settings")
				.onClick(() => {
					this.plugin.propertyTypeManager.openPropertySettingsModal(property);
				});
		});

		menu.addSections([section]);
		menu.sections = menu.sections.toSorted((a, b) => a.localeCompare(b));
	}
}
class BasesViewsManager extends Component {}
