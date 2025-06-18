import { Notice, Modal, ButtonComponent, Plugin, getIconIds } from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	getDefaultSettings,
} from "./settings";
import {
	registerCustomPropertyTypeWidgets,
	sortRegisteredTypeWidgets,
} from "~/CustomPropertyTypes/register";
import { customizePropertyEditorMenu } from "~/MetadataEditor";

export class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = getDefaultSettings();

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			// @ts-expect-error Private API not documented in obsidian-typings
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	copyIcons(): void {
		const icons = getIconIds();
		const str = icons.reduce((acc, cur) => {
			const quoted = `"${cur}"`;
			if (!acc) return quoted;
			return acc + " | " + quoted;
		}, "");
		navigator.clipboard.writeText(str);
	}

	async onload(): Promise<void> {
		this.rebuildLeaves();
		await this.loadSettings();
		registerCustomPropertyTypeWidgets(this);
		sortRegisteredTypeWidgets(this);
		customizePropertyEditorMenu(this);
		new Notice("Loaded...");
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
