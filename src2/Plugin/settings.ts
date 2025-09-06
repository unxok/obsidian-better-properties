import { Prettify } from "~/lib/utils";
import { z } from "zod";
import { propertySettingsSchema } from "~/CustomPropertyTypes";
import { PluginSettingTab, Setting } from "obsidian";
import { BetterProperties } from "./plugin";
import { Icon } from "~/lib/types/icons";
import { obsidianText } from "~/i18next/obsidian";
import { MultiselectComponent } from "~/Classes/MultiSelect";
import { PropertyTypeSuggest } from "~/Classes/InputSuggest/PropertyTypeSuggest";
import { sortAndFilterRegisteredTypeWidgets } from "~/CustomPropertyTypes/register";

export const betterPropertiesSettingsSchema = z.object({
	propertySettings: z.record(propertySettingsSchema).optional(),
	confirmPropertySettingsReset: z.boolean().optional(),
	confirmPropertyDelete: z.boolean().optional(),
	propertyLabelWidth: z.number().optional(),
	defaultLabelWidth: z.string().catch("9em"), // not UI facing
	hiddenPropertyTypes: z.array(z.string()).optional(),
});

export type BetterPropertiesSettings = Prettify<
	z.infer<typeof betterPropertiesSettingsSchema>
>;

export const getDefaultSettings = (): BetterPropertiesSettings => ({
	propertySettings: {},
	confirmPropertySettingsReset: true,
	confirmPropertyDelete: true,
	propertyLabelWidth: undefined,
	defaultLabelWidth: "9em",
	hiddenPropertyTypes: [],
});

export class BetterPropertiesSettingsTab extends PluginSettingTab {
	constructor(public plugin: BetterProperties) {
		super(plugin.app, plugin);
	}

	display(): void {
		const { plugin, containerEl } = this;
		containerEl.empty();
		const { settings } = plugin;

		new Setting(containerEl)
			.setName("Property label width")
			.setDesc("The width of the label for each frontmatter property.")
			.addExtraButton((cmp) => {
				cmp
					.setIcon("lucide-rotate-ccw" satisfies Icon)
					.setTooltip(
						obsidianText("interface.tooltip-restore-default-settings")
					)
					.onClick(() => {
						settings.propertyLabelWidth = undefined;
						plugin.app.workspace.trigger(
							"better-properties:property-label-width-change",
							undefined
						);
						this.display();
					});
			})
			.addSlider((cmp) => {
				cmp
					.setDynamicTooltip()
					.setLimits(0, 500, 1)
					.setValue(settings.propertyLabelWidth ?? 0)
					.onChange((n) => {
						settings.propertyLabelWidth = n;
						plugin.app.workspace.trigger(
							"better-properties:property-label-width-change",
							n
						);
					});
			});

		new Setting(containerEl)
			.setName("Hidden property types")
			.setDesc("The following types will be disabled.")
			.then((s) => {
				const cmp = new MultiselectComponent(s);
				cmp
					.setValues(settings.hiddenPropertyTypes ?? [])
					.onChange((arr) => {
						settings.hiddenPropertyTypes = [...arr];
					})
					.addSuggest((inputEl) => {
						return new PropertyTypeSuggest(plugin.app, inputEl)
							.setFilter((item) => !cmp.values.contains(item.type))
							.onSelect((t, e) => {
								e.preventDefault();
								e.stopImmediatePropagation();
								inputEl.textContent = t.type;
								cmp.inputEl.blur();
								cmp.inputEl.focus();
							});
					})
					.renderValues();
			});

		new Setting(containerEl).setHeading().setName("Warnings");

		new Setting(containerEl)
			.setName("Confirm reset property settings")
			.setDesc("Prompt before resetting a property's settings.")
			.addToggle((cmp) => {
				cmp
					.setValue(settings.confirmPropertySettingsReset ?? true)
					.onChange((b) => {
						settings.confirmPropertySettingsReset = b;
					});
			});

		new Setting(containerEl)
			.setName("Confirm delete property")
			.setDesc("Prompt before deleting a property from all notes.")
			.addToggle((cmp) => {
				cmp.setValue(settings.confirmPropertyDelete ?? true).onChange((b) => {
					settings.confirmPropertyDelete = b;
				});
			});
	}

	hide(): void {
		super.hide.call(this);
		// TODO settings won't save it app is closed while the tab is still displayed. Might be better to just do a debounce to save after every change
		this.plugin.saveSettings();

		const { plugin } = this;
		sortAndFilterRegisteredTypeWidgets(plugin);
		plugin.refreshPropertyEditors();
	}
}
