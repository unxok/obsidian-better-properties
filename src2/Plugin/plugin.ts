import {
	Modal,
	ButtonComponent,
	Plugin,
	Workspace,
	WorkspaceLeaf,
} from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	getDefaultSettings,
} from "./settings";
import {
	registerCustomPropertyTypeWidgets,
	sortRegisteredTypeWidgets,
	unregisterCustomPropertyTypeWidgets,
	wrapAllPropertyTypeWidgets,
} from "~/CustomPropertyTypes/register";
import {
	customizePropertyEditorMenu,
	patchMetadataEditor,
	refreshPropertyEditor,
} from "~/MetadataEditor";
import { around, dedupe } from "monkey-around";
import { monkeyAroundKey } from "~/lib/constants";

export class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = getDefaultSettings();

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	setupCommands(): void {
		this.addCommand({
			id: "refresh-property-editors",
			name: "Refresh Property Editors",
			callback: () => {
				Object.values(this.app.metadataTypeManager.properties).forEach(
					({ name }) => {
						refreshPropertyEditor(this, name);
					}
				);
			},
		});
	}

	async onload(): Promise<void> {
		await this.loadSettings();
		registerCustomPropertyTypeWidgets(this);
		wrapAllPropertyTypeWidgets(this);
		sortRegisteredTypeWidgets(this);
		this.setupCommands();
		this.app.workspace.onLayoutReady(async () => {
			customizePropertyEditorMenu(this);
			patchMetadataEditor(this);

			this.rebuildLeaves();
		});
		this.handlePropertyLabelWidth();

		// this.test();
	}

	test() {
		const { workspace } = this.app;
		const remove = around(workspace, {
			setActiveLeaf(old) {
				return dedupe(
					monkeyAroundKey,
					old,
					function (leaf: WorkspaceLeaf, ...rest: unknown[]) {
						console.log("set leaf: ", leaf);
						// @ts-expect-error
						const exit = () => old.call(workspace, ...rest);
					}
				);
			},
		});
		this.register(remove);
	}

	handlePropertyLabelWidth(): void {
		this.updateSettings((prev) => ({
			...prev,
			defaultPropertyLabelWidth: document.body.style.getPropertyValue(
				"---metadata-label-width"
			),
		}));
		this.app.workspace.on(
			"better-properties:property-label-width-change",
			(propertyLabelWidth) => {
				this.updateSettings((prev) => ({ ...prev, propertyLabelWidth }));
			}
		);
		if (this.settings.propertyLabelWidth !== undefined) {
			document.body.style.setProperty(
				"--metadata-label-width",
				this.settings.propertyLabelWidth + "px"
			);
		}
	}

	onunload(): void {
		unregisterCustomPropertyTypeWidgets(this);
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

		const parsed = betterPropertiesSettingsSchema.safeParse(loaded);
		// settings are valid, so use them
		if (parsed.success) {
			this.settings = parsed.data;
			return;
		}

		// settings invalid, warn user and offer options
		const msg0 = "Better Properties: Invalid plugin settings detected!";
		const msg1 =
			"This likely happened because you modified the plugin's settings.json file directly. If not, please open an issue on the plugin's github repository";
		console.error(msg0 + "\n" + msg1);
		console.error(parsed.error);
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
