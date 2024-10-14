// TRANSLATIONS done
import { getFixedT } from "@/libs/i18Next";
import BetterProperties from "@/main";
import { PluginSettingTab, Setting } from "obsidian";

export class BetterPropertiesSettingTab extends PluginSettingTab {
	plugin: BetterProperties;
	constructor(plugin: BetterProperties) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const text = getFixedT();
		const { containerEl, plugin } = this;

		const {
			showResetPropertySettingWarning,
			templateIdName,
			templatePropertyName,
			showSyncTemplateWarning,
		} = plugin.settings;

		containerEl.empty();

		new Setting(containerEl)
			.setName(text("confirmResetSettingTitle"))
			.setDesc(text("confirmResetSettingDesc"))
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
			.setName(text("synchronizationSettingTitle"));

		new Setting(containerEl)
			.setName(text("templatePropertyNameSettingTitle"))
			.setDesc(text("templatePropertyNameSettingDesc"))
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
			.setName(text("templatePropertyIdSettingTitle"))
			.setDesc(text("templatePropertyIdSettingDesc"))
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
			.setName(text("confirmTemplateSynchronizeTitle"))
			.setDesc(text("confirmTemplateSynchronizeDesc"))
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
