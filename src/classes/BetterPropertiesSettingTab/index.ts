import BetterProperties from "@/main";
import { PluginSettingTab, Setting } from "obsidian";

export class BetterPropertiesSettingTab extends PluginSettingTab {
	plugin: BetterProperties;
	constructor(plugin: BetterProperties) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl, plugin } = this;

		const {
			templateIdName,
			templatePropertyName,
			showSyncTemplateWarning,
		} = plugin.settings;

		containerEl.empty();
		new Setting(containerEl).setHeading().setName("Synchronization");

		new Setting(containerEl)
			.setName("Template property name")
			.setDesc(
				"The property name that notes will use to indicate what their template is."
			)
			.addText((cmp) =>
				cmp
					.setValue(templatePropertyName)
					.onChange(
						async (v) =>
							await plugin.updateSettings((prev) => ({
								...prev,
								templatePropertyName: v,
							}))
					)
			);

		new Setting(containerEl)
			.setName("Template property ID name")
			.setDesc(
				"The property name that template notes will use to define their template identifier."
			)
			.addText((cmp) =>
				cmp
					.setValue(templateIdName)
					.onChange(
						async (v) =>
							await plugin.updateSettings((prev) => ({
								...prev,
								templateIdName: v,
							}))
					)
			);

		new Setting(containerEl)
			.setName("Confirm template synchronize")
			.setDesc(
				"Whether you want to get prompted to confirm property synchronization."
			)
			.addToggle((cmp) =>
				cmp
					.setValue(showSyncTemplateWarning)
					.onChange(
						async (b) =>
							await plugin.updateSettings((prev) => ({
								...prev,
								showSyncTemplateWarning: b,
							}))
					)
			);
	}
}
