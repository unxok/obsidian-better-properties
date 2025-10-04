import {
	Modal,
	ButtonComponent,
	Plugin,
	MarkdownView,
	MetadataTypeManager,
} from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	BetterPropertiesSettingsTab,
	getDefaultSettings,
} from "./settings";
import {
	registerCustomPropertyTypeWidgets,
	sortAndFilterRegisteredTypeWidgets,
	unregisterCustomPropertyTypeWidgets,
	wrapAllPropertyTypeWidgets,
} from "~/CustomPropertyTypes/register";
import {
	customizePropertyEditorMenu,
	patchMetadataEditor,
} from "~/MetadataEditor";
import { PropertyWidget } from "obsidian-typings";
import { PropertySuggestModal } from "~/classes/InputSuggest/PropertySuggest";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { patchMetadataCache } from "~/MetadataCache";
import * as v from "valibot";
import { openRenameModal } from "~/MetadataEditor/propertyEditorMenu/rename";
import { registerBpJsCodeProcessors } from "~/bpjs";
import { BpJsApi, setupBpJsListeners } from "~/bpjs/api";
import { around, dedupe } from "monkey-around";
import { monkeyAroundKey } from "~/lib/constants";
import { getTrueProperty } from "~/CustomPropertyTypes/utils";

const patchMetadataTypeManager = (plugin: BetterProperties): void => {
	const removePatch = around(plugin.app.metadataTypeManager, {
		getAssignedWidget(old) {
			return dedupe(monkeyAroundKey, old, function (property) {
				// @ts-expect-error
				const that: MetadataTypeManager = this;
				return old.call(that, getTrueProperty(property));
			});
		},
		setType(old) {
			return dedupe(monkeyAroundKey, old, function (property, type) {
				// @ts-expect-error
				const that: MetadataTypeManager = this;
				return old.call(that, getTrueProperty(property), type);
			});
		},
	});

	plugin.register(removePatch);
};

export class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = getDefaultSettings();
	disabledTypeWidgets: Record<string, PropertyWidget> = {};
	codePrefix = "bpjs:"; // TODO make configurable

	bpjsInstances: Set<BpJsApi> = new Set();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingsTab(this));
		patchMetadataTypeManager(this);
		registerCustomPropertyTypeWidgets(this);
		wrapAllPropertyTypeWidgets(this);
		sortAndFilterRegisteredTypeWidgets(this);
		this.setupCommands();
		this.app.workspace.onLayoutReady(async () => {
			customizePropertyEditorMenu(this);
			patchMetadataEditor(this);
			patchMetadataCache(this);
			setupBpJsListeners(this);
			registerBpJsCodeProcessors(this);

			this.rebuildLeaves();
		});
		this.handlePropertyLabelWidth();
		this.registerEvent(
			this.app.vault.on("config-changed", () => {
				this.refreshPropertyEditors();
			})
		);
	}

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	refreshPropertyEditors(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			const me = leaf.view.metadataEditor;
			if (!me) return;
			leaf.rebuildView();
		});
	}

	setupCommands(): void {
		this.addCommand({
			id: "refresh-property-editors",
			name: "Refresh Property Editors",
			callback: () => {
				this.refreshPropertyEditors();
			},
		});
		this.addCommand({
			id: "rebuild-views",
			name: "Rebuild views",
			callback: () => {
				this.rebuildLeaves();
			},
		});
		this.addCommand({
			id: "open-property-settings",
			name: "Open property settings",
			callback: () => {
				const modal = new PropertySuggestModal(this);
				modal.onChooseItem = (item) => {
					modal.close();
					showPropertySettingsModal({
						plugin: this,
						property: item.name,
					});
				};
				modal.open();
			},
		});
		this.addCommand({
			id: "rename-property",
			name: "Rename property",
			callback: () => {
				const modal = new PropertySuggestModal(this);
				modal.onChooseItem = (item) => {
					modal.close();
					openRenameModal({
						plugin: this,
						property: item.name,
					});
				};
				modal.open();
			},
		});
	}

	handlePropertyLabelWidth(): void {
		this.updateSettings((prev) => ({
			...prev,
			defaultLabelWidth: document.body.style.getPropertyValue(
				"---metadata-label-width"
			),
		}));
		const updateDomMetadataLabelWidth = (width: number | undefined) => {
			document.body.style.setProperty(
				"--metadata-label-width",
				width === undefined ? this.settings.defaultLabelWidth : width + "px"
			);
		};
		this.app.workspace.on(
			"better-properties:property-label-width-change",
			(propertyLabelWidth) => {
				updateDomMetadataLabelWidth(propertyLabelWidth);
				this.updateSettings((prev) => ({ ...prev, propertyLabelWidth }));
			}
		);
		updateDomMetadataLabelWidth(this.settings.propertyLabelWidth);
	}

	onunload(): void {
		unregisterCustomPropertyTypeWidgets(this);
		this.bpjsInstances.forEach((bpjs) => {
			bpjs.component.unload();
		});
	}

	async onExternalSettingsChange() {
		await this.loadSettings();
	}

	async loadSettings() {
		const loaded = await this.loadData();

		// no settings yet, use default
		if (!loaded) {
			this.settings = getDefaultSettings();
			return;
		}

		const parsed = v.safeParse(betterPropertiesSettingsSchema, loaded);
		// settings are valid, so use them
		if (parsed.success) {
			this.settings = parsed.output;
			return;
		}

		// settings invalid, warn user and offer options
		const msg0 = "Better Properties: Invalid plugin settings detected!";
		const msg1 =
			"This likely happened because you modified the plugin's settings.json file directly. If not, please open an issue on the plugin's github repository";
		console.error(msg0 + "\n" + msg1);
		console.error(parsed.issues);
		const modal = new Modal(this.app);
		modal.setTitle(msg0);
		modal.contentEl.createEl("p", { text: msg1 });
		modal.contentEl.createEl("p", {
			text: "You can also reset the plugin's settings entirely by clicking the button below.",
		});
		const btnContainer = modal.contentEl.createDiv({
			cls: "modal-button-container",
		});
		new ButtonComponent(btnContainer)
			.setWarning()
			.setButtonText("Reset settings")
			.onClick(() => {
				this.settings = getDefaultSettings();
			});

		modal.open();
		return;
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
}
