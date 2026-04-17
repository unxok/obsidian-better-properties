import { ReorderSettingGroup } from "#/classes/ReorderSettingGroup";
import { createActionsSettingsGroup } from "#/lib/obsidian";
import { tryCatch, syncTryCatch, TryCatchResult } from "#/lib/utils";
import { PluginSettingTab, SettingGroup, Notice, Modal } from "obsidian";
import { arrayMove } from "~/lib/utils";
import { CustomPropertyTypeKey } from "../managers/PropertyTypeManager/schema";
import { BetterProperties } from "../plugin";
import { betterPropertiesSettingsSchema } from "./schema";
import { t } from "#/i18n";
import * as v from "valibot";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { ColorTextComponent } from "#/classes/ColorTextComponent";

/**
 * The class for rendering the plugin settings tab in the obsidian settings modal
 */
export class BetterPropertiesSettingsTab extends PluginSettingTab {
	constructor(public plugin: BetterProperties) {
		super(plugin.app, plugin);
	}

	display(): void {
		const { containerEl, plugin } = this;
		const settings = plugin.getSettings();
		containerEl.empty();

		new SettingGroup(containerEl)
			.addSetting((s) => {
				s.setName("Appearance and style")
					.setDesc(
						"Adjust the appearance of various different property types and other features"
					)
					.addButton((button) => {
						button.setIcon("lucide-settings").onClick(() => {
							new AppearanceSettingsModal(this).open();
						});
					});
			})
			.addSetting((setting) => {
				setting
					.setName("Property link syntax")
					.setDesc(
						"The text to use to detect a property link when followed by a hashtag (#) within a wikilink."
					)
					.addText((text) => {
						text.setValue(settings.propertyLinkSyntax).onChange(async (v) => {
							await plugin.updateSettings((s) => ({
								...s,
								propertyLinkSyntax: v,
							}));
						});
					});
			});

		const defaultPropertyTypeSettingGroup = new SettingGroup(
			containerEl
		).setHeading(
			t("pluginSettings.defaultPropertyTypeSettingsSettingsGroupTitle")
		);

		Object.keys(this.plugin.propertyTypeManager.customPropertyTypes).forEach(
			(type) => {
				defaultPropertyTypeSettingGroup.addSetting((setting) => {
					this.plugin.propertyTypeManager.renderPropertyTypeSetting({
						setting,
						propertyName: "",
						type: type as CustomPropertyTypeKey,
					});
				});
			}
		);

		const globalFormulasSettingGroup = new ReorderSettingGroup(containerEl)
			.setHeading("Global formulas")
			.addExtraButton((button) => {
				button
					.setIcon("lucide-plus-circle")
					.setTooltip("Create new global formula")
					.onClick(() => {
						new FormulaEditorModal(this).open();
					});
			})
			.onReorder(async (from, to) => {
				await plugin.updateSettings((prev) => {
					const copy = { ...prev };
					copy.globalFormulas = Object.fromEntries(
						arrayMove(Object.entries(copy.globalFormulas), from, to)
					);
					return copy;
				});
				this.display();
			});

		Object.entries(settings.globalFormulas).forEach(
			([name, { formula, description }]) => {
				globalFormulasSettingGroup.addSetting((s) => {
					s.settingEl.classList.add("better-properties--mod-show-info");
					s.setName(name)
						.setDesc(description)
						.addButton((button) => {
							button.setButtonText("Edit").onClick(() => {
								new FormulaEditorModal(this, name, description, formula).open();
							});
						})
						.addExtraButton((button) => {
							button.setIcon("lucide-x").onClick(async () => {
								await plugin.updateSettings((prev) => {
									const copy = { ...prev };
									delete copy.globalFormulas[name];
									return copy;
								});
								this.display();
							});
						});
				});
			}
		);

		createActionsSettingsGroup({
			plugin,
			containerEl,
			documenationLink: "https://better-properties.unxok.com",
			onExport: async () => {
				const str = JSON.stringify(plugin.getSettings(), null, 2);
				const { error } = await tryCatch(navigator.clipboard.writeText(str));
				new Notice(error ?? t("common.copiedToClipboard"));
			},
			validateImport: (data) => {
				const parsedJson = syncTryCatch(() => JSON.parse(data) as {});
				if (!parsedJson.success) return parsedJson;
				const parsedData = v.safeParse(
					betterPropertiesSettingsSchema,
					parsedJson.data
				);
				if (!parsedData.success) {
					console.warn(parsedData.issues);
					return {
						success: false,
						data: undefined,
						error: t("actionsSettingGroup.importModal.parsingError"),
					} satisfies TryCatchResult<
						v.InferOutput<typeof betterPropertiesSettingsSchema>
					>;
				}
				return {
					success: true,
					data: parsedData.output,
					error: undefined,
				};
			},
			onImport: async (data) => {
				await plugin.setSettings(data);
				this.display();
			},
			onReset: async () => {
				const defaultSettings = v.parse(betterPropertiesSettingsSchema, {});
				await this.plugin.setSettings(defaultSettings);
				this.display();
			},
		});
	}

	hide(): void {
		this.plugin.rebuildLeaves();
		super.hide();
	}
}

class FormulaEditorModal extends ConfirmationModal {
	constructor(
		public settingsTab: BetterPropertiesSettingsTab,
		public name: string = "",
		public description: string = "",
		public formula: string = ""
	) {
		super(settingsTab.plugin.app);
	}

	onOpen(): void | Promise<void> {
		this.setTitle("Edit formula");
		new SettingGroup(this.contentEl)
			.addSetting((s) => {
				s.setName("Name")
					.setDesc(
						"The name of the formula. Use this name in bases to reference this formula."
					)
					.addText((textComponent) => {
						textComponent.setValue(this.name).onChange((v) => {
							this.name = v;
						});
					});
			})
			.addSetting((s) => {
				s.setName("Description")
					.setDesc("A description of the formula.")
					.addText((textComponent) => {
						textComponent.setValue(this.description).onChange((v) => {
							this.description = v;
						});
					});
			})
			.addSetting((s) => {
				s.setName("Formula")
					.setDesc(
						window.createFragment((el) => {
							el.createEl("a", {
								text: "Syntax reference",
								href: "https://obsidian.md/help/formulas",
							});
						})
					)
					.addTextArea((textComponent) => {
						textComponent.setValue(this.formula).onChange((v) => {
							this.formula = v;
						});
					});
			});
	}

	async onClose(): Promise<void> {
		await this.settingsTab.plugin.updateSettings((prev) => ({
			...prev,
			globalFormulas: {
				...prev.globalFormulas,
				[this.name]: {
					description: this.description,
					formula: this.formula,
				},
			},
		}));
		this.settingsTab.display();
	}
}

class AppearanceSettingsModal extends Modal {
	constructor(public settingsTab: BetterPropertiesSettingsTab) {
		super(settingsTab.plugin.app);
	}

	onOpen(): void {
		const reRenderModal = () => {
			this.contentEl.empty();
			this.onOpen();
		};

		const { plugin } = this.settingsTab;

		const group = new ReorderSettingGroup(this.contentEl)
			.setHeading("Colors")
			.addExtraButton((button) => {
				button
					.setIcon("lucide-rotate-ccw")
					.setTooltip("Reset")
					.onClick(async () => {
						const modal = new ConfirmationModal(plugin.app);
						modal.onOpen = () => {
							modal.setTitle("Colors reset confirmation");
							modal.contentEl.createEl("p", {
								text: "This will permanently reset the colors back to their default.",
							});
							modal
								.addFooterButton((button) => {
									button.setButtonText("Cancel").onClick(() => {
										modal.close();
									});
								})
								.addFooterButton((button) => {
									button
										.setButtonText("Reset")
										.setWarning()
										.onClick(async () => {
											await plugin.updateSettings((prev) => {
												const { colors } = v.parse(
													betterPropertiesSettingsSchema,
													{}
												).appearanceSettings;
												prev.appearanceSettings.colors = colors;
												return prev;
											});
											modal.close();
											reRenderModal();
										});
								});
						};
						modal.open();
					});
			})
			.addExtraButton((button) => {
				button
					.setIcon("lucide-plus-circle")
					.setTooltip("Add new color")
					.onClick(async () => {
						await plugin.updateSettings((prev) => ({
							...prev,
							appearanceSettings: {
								...prev.appearanceSettings,
								colors: [
									...prev.appearanceSettings.colors,
									{ name: "", background: "" },
								],
							},
						}));
						reRenderModal();
					});
			})
			.onReorder(async (from, to) => {
				await plugin.updateSettings((prev) => ({
					...prev,
					appearanceSettings: {
						...prev.appearanceSettings,
						colors: arrayMove(prev.appearanceSettings.colors, from, to),
					},
				}));
				reRenderModal();
			});

		plugin.getSettings().appearanceSettings.colors.forEach((color, index) => {
			group.addSetting((s) => {
				s.settingEl.addClass("better-properties--mod-hide-info");
				s.addText((textComponent) => {
					textComponent
						.setPlaceholder("Name")
						.setValue(color.name)
						.onChange(async (v) => {
							await plugin.updateSettings((prev) => {
								const colors = [...prev.appearanceSettings.colors];
								colors[index].name = v;
								return {
									...prev,
									appearanceSettings: { ...prev.appearanceSettings, colors },
								};
							});
						});
				});

				new ColorTextComponent(s.controlEl)
					.setValue(color.background)
					.onChange(async (v) => {
						await plugin.updateSettings((prev) => {
							const colors = [...prev.appearanceSettings.colors];
							colors[index].background = v;
							return {
								...prev,
								appearanceSettings: { ...prev.appearanceSettings, colors },
							};
						});
					});

				s.addExtraButton((button) => {
					button
						.setTooltip("Remove")
						.setIcon("lucide-x")
						.onClick(async () => {
							await plugin.updateSettings((prev) => {
								const colors = prev.appearanceSettings.colors.filter(
									(_, i) => i !== index
								);
								return {
									...prev,
									appearanceSettings: { ...prev.appearanceSettings, colors },
								};
							});
							reRenderModal();
						});
				});
			});
		});
	}

	onClose(): void {
		this.settingsTab.display();
	}
}
