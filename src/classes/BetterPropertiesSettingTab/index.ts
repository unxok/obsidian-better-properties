// TRANSLATIONS done
import { text } from "@/i18Next";
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
			showResetPropertySettingWarning,
			templateIdName,
			templatePropertyName,
			showSyncTemplateWarning,
		} = plugin.settings;

		containerEl.empty();

		new Setting(containerEl)
			.setName(
				text("BetterPropertiesSettingTab.settings.confirmReset.title")
			)
			.setDesc(
				text("BetterPropertiesSettingTab.settings.confirmReset.desc")
			)
			.addToggle((cmp) =>
				cmp.setValue(showResetPropertySettingWarning).onChange(
					async (b) =>
						await plugin.updateSettings((prev) => ({
							...prev,
							showResetPropertySettingWarning: b,
						}))
				)
			);

		new Setting(containerEl)
			.setHeading()
			.setName(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.header"
				)
			);

		new Setting(containerEl)
			.setName(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.templatePropertyName.title"
				)
			)
			.setDesc(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.templatePropertyName.desc"
				)
			)
			.addText((cmp) =>
				cmp.setValue(templatePropertyName).onChange(
					async (v) =>
						await plugin.updateSettings((prev) => ({
							...prev,
							templatePropertyName: v,
						}))
				)
			);

		new Setting(containerEl)
			.setName(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.templatePropertyId.title"
				)
			)
			.setDesc(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.templatePropertyId.desc"
				)
			)
			.addText((cmp) =>
				cmp.setValue(templateIdName).onChange(
					async (v) =>
						await plugin.updateSettings((prev) => ({
							...prev,
							templateIdName: v,
						}))
				)
			);

		new Setting(containerEl)
			.setName(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.confirmSynchronize.title"
				)
			)
			.setDesc(
				text(
					"BetterPropertiesSettingTab.settings.synchronization.confirmSynchronize.desc"
				)
			)
			.addToggle((cmp) =>
				cmp.setValue(showSyncTemplateWarning).onChange(
					async (b) =>
						await plugin.updateSettings((prev) => ({
							...prev,
							showSyncTemplateWarning: b,
						}))
				)
			);
	}
}
