import {
	metdataSectionId,
	typeKeySuffixes,
	typeWidgetPrefix,
} from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { App, Modal, Setting } from "obsidian";
import BetterProperties from "@/main";
import { IconSuggest } from "@/classes/IconSuggest";
import { TextColorComponent } from "@/classes/TextColorComponent";
import { createButtonSettings } from "@/typeWidgets/Button";
import { createDropdownSettings } from "@/typeWidgets/Dropdown";
import { createNumberPlusSettings } from "@/typeWidgets/NumberPlus";
import { createSliderSettings } from "@/typeWidgets/Slider";
import {
	defaultPropertySettings,
	PropertySettings,
	PropertySettingsSchema,
} from "@/PropertySettings";
import { createStarsSettings } from "@/typeWidgets/Stars";
import { ConfirmationModal } from "@/classes/ConfirmationModal";
import { text } from "@/i18Next";
import { createSection } from "@/libs/utils/setting";

export const addSettings = ({ menu, plugin, key }: MetadataAddItemProps) => {
	menu.addItem((item) =>
		item
			.setSection(metdataSectionId)
			.setIcon("wrench")
			.setTitle("Settings")
			.onClick(() => {
				new SettingsModal(plugin, key).open();
			})
	);
};

// type PropertySettingsItem<T extends keyof typeof typeKeySuffixes> = Record<T, Record<string, any>>;

class SettingsModal extends Modal {
	plugin: BetterProperties;
	form: PropertySettings;
	property: string;
	constructor(plugin: BetterProperties, property: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.property = property;
		const defaultForm = { ...defaultPropertySettings };
		const form = plugin.settings.propertySettings[
			property.toLowerCase()
		] ?? {
			...defaultForm,
		};
		Object.keys(defaultForm).forEach((k) => {
			const key = k as keyof PropertySettings;
			const defaultValue = defaultForm[key];
			if (!form[key]) {
				// @ts-ignore TODO IDK why typescript doesn't like this
				form[key] = { ...defaultValue };
				return;
			}
			// @ts-ignore TODO IDK why typescript doesn't like this
			form[key] = { ...defaultValue, ...form[key] };
		});
		this.form = form;
	}

	updateForm<
		T extends keyof PropertySettings,
		K extends keyof PropertySettings[T]
	>(type: T, key: K, value: PropertySettings[T][K]): void {
		this.form[type][key] = value;
	}

	onOpen(): void {
		const { contentEl, property } = this;
		const typeKey =
			this.app.metadataTypeManager.getPropertyInfo(property.toLowerCase())
				?.type ?? "";

		contentEl.empty();
		this.setTitle(
			text("augmentedPropertyMenu.settings.modal.title", { property })
		);

		const btnContainer = contentEl.createEl("p", {
			cls: "better-properties-property-settings-button-container",
		});

		btnContainer
			.createEl("button", {
				text: text("buttonText.export"),
				cls: "",
			})
			.addEventListener("click", async () => {
				const str = JSON.stringify(this.form);
				await window.navigator.clipboard.writeText(str);
				new Notice(text("notices.copiedExportedJSON"));
			});

		btnContainer
			.createEl("button", {
				text: text("buttonText.import"),
				cls: "",
			})
			.addEventListener("click", () => {
				const updateForm = (newForm: PropertySettings) => {
					this.form = { ...newForm };
					this.close();
				};
				new ImportModal(this.plugin.app, updateForm).open();
			});

		btnContainer
			.createEl("button", {
				text: text("buttonText.resetToDefault"),
				cls: "mod-destructive",
			})
			.addEventListener("click", () => {
				if (!this.plugin.settings.showResetPropertySettingWarning) {
					this.form = { ...defaultPropertySettings };
					this.close();
					return;
				}
				const modal = new ConfirmationModal(this.app);
				modal.onOpen = () => {
					modal.contentEl.empty();
					modal.setTitle(
						text(
							"augmentedPropertyMenu.settings.modal.resetModal.title"
						)
					);
					modal.contentEl.createEl("p", {
						text: text(
							"augmentedPropertyMenu.settings.modal.resetModal.desc"
						),
					});
					modal.createButtonContainer();
					modal.createCheckBox({
						text: text("dontAskAgain"),
						defaultChecked:
							!this.plugin.settings
								.showResetPropertySettingWarning,
						onChange: async (b) =>
							await this.plugin.updateSettings((prev) => ({
								...prev,
								showResetPropertySettingWarning: !b,
							})),
					});
					modal
						.createFooterButton((cmp) =>
							cmp
								.setButtonText(text("buttonText.cancel"))
								.onClick(() => modal.close())
						)
						.createFooterButton((cmp) =>
							cmp
								.setButtonText(text("buttonText.reset"))
								.setWarning()
								.onClick(() => {
									this.form = { ...defaultPropertySettings };
									modal.close();
									this.close();
								})
						);
					// new Setting(modal.contentEl)
					// 	.addButton((cmp) =>
					// 		cmp
					// 			.setButtonText("nevermind...")
					// 			.onClick(() => modal.close())
					// 	)
					// 	.addButton((cmp) =>
					// 		cmp
					// 			.setButtonText("do it!")
					// 			.setWarning()
					// 			.onClick(() => {
					// 				this.form = { ...defaultPropertySettings };
					// 				modal.close();
					// 				this.close();
					// 			})
					// 	);
				};
				modal.open();
			});

		this.createGeneral(contentEl, this.form.general, (key, value) => {
			this.updateForm("general", key, value);
		});

		switch (
			typeKey.slice(typeWidgetPrefix.length) as keyof PropertySettings
		) {
			case "slider":
				return createSliderSettings(
					contentEl,
					this.form.slider,
					(key, value) => this.updateForm("slider", key, value)
				);
			case "numberPlus":
				return createNumberPlusSettings(
					contentEl,
					this.form.numberPlus,
					(key, value) => this.updateForm("numberPlus", key, value)
				);
			case "dropdown":
				return createDropdownSettings(
					contentEl,
					this.form["dropdown"],
					(key, value) => this.updateForm("dropdown", key, value),
					this.plugin
				);
			case "button":
				return createButtonSettings(
					contentEl,
					this.form["button"],
					(key, value) => this.updateForm("button", key, value),
					this.plugin
				);
			case "stars":
				return createStarsSettings(
					contentEl,
					this.form["stars"],
					(key, value) => this.updateForm("stars", key, value),
					this.plugin
				);
			default:
				new Setting(contentEl)
					.setName(
						text(
							"augmentedPropertyMenu.settings.modal.nonCustomizableType.title"
						)
					)
					.setDesc(
						text(
							"augmentedPropertyMenu.settings.modal.nonCustomizableType.desc"
						)
					);
		}
	}

	async onClose(): Promise<void> {
		const { plugin, property, form } = this;
		const key = property.toLowerCase();
		await plugin.updateSettings((prev) => ({
			...prev,
			propertySettings: { ...prev.propertySettings, [key]: form },
		}));
		plugin.refreshPropertyEditor(key);
	}

	createGeneral(
		el: HTMLElement,
		form: typeof this.form.general,
		updateForm: <T extends keyof typeof this.form.general>(
			key: T,
			value: (typeof this.form.general)[T]
		) => void
	): void {
		const { content } = createSection(
			el,
			text("augmentedPropertyMenu.settings.modal.general.heading"),
			true
		);

		// new Setting(content)
		// 	.setName("CSS classes")
		// 	.setDesc(
		// 		"Add additional CSS classes to the container div (div.metadata-property). To add multiple names, separate each by a space."
		// 	)
		// 	.addText((cmp) =>
		// 		cmp
		// 			.setValue(form.cssClass)
		// 			.onChange((v) => updateForm("cssClass", v))
		// 	);

		new Setting(content)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.general.hidden.title"
				)
			)
			.setDesc(
				text("augmentedPropertyMenu.settings.modal.general.hidden.desc")
			)
			.addToggle((cmp) =>
				cmp
					.setValue(form.hidden)
					.onChange((b) => updateForm("hidden", b))
			);

		new Setting(content)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.general.customIcon.desc"
				)
			)
			.setDesc(
				text(
					"augmentedPropertyMenu.settings.modal.general.customIcon.desc"
				)
			)
			.addSearch((cmp) =>
				cmp
					.setValue(form.customIcon)
					.onChange((v) => updateForm("customIcon", v))
					.then((cmp) => new IconSuggest(this.app, cmp))
			);

		new Setting(content)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.general.iconColor.title"
				)
			)
			.setDesc(
				text(
					"augmentedPropertyMenu.settings.modal.general.iconColor.desc"
				)
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.iconColor)
					.onChange((v) => updateForm("iconColor", v))
			);

		new Setting(content)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.general.iconHoverColor.title"
				)
			)
			.setDesc(
				text(
					"augmentedPropertyMenu.settings.modal.general.iconHoverColor.desc"
				)
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.iconHoverColor)
					.onChange((v) => updateForm("iconHoverColor", v))
			);

		new Setting(content)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.general.labelColor.title"
				)
			)
			.setDesc(
				text(
					"augmentedPropertyMenu.settings.modal.general.labelColor.desc"
				)
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.labelColor)
					.onChange((v) => updateForm("labelColor", v))
			);

		new Setting(content)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.general.valueTextColor.title"
				)
			)
			.setDesc(
				text(
					"augmentedPropertyMenu.settings.modal.general.valueTextColor.desc"
				)
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.textColor)
					.onChange((v) => updateForm("textColor", v))
			);
	}
}

class ImportModal extends ConfirmationModal {
	updateForm: (newForm: PropertySettings) => void;
	constructor(app: App, updateForm: (newForm: PropertySettings) => void) {
		super(app);
		this.updateForm = updateForm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle(
			text("augmentedPropertyMenu.settings.modal.importModal.title")
		);
		contentEl.createEl("p", {
			text: text("augmentedPropertyMenu.settings.modal.importModal.desc"),
		});
		contentEl.createEl("p", {
			text: text("augmentedPropertyMenu.settings.modal.importModal.note"),
			attr: { style: "color: var(--text-error)" },
		});
		let jsonText = "";
		new Setting(contentEl)
			.setName(
				text(
					"augmentedPropertyMenu.settings.modal.importModal.setting.title"
				)
			)
			.setDesc(
				text(
					"augmentedPropertyMenu.settings.modal.importModal.setting.desc"
				)
			)
			.addText((cmp) =>
				cmp
					.setPlaceholder(
						text(
							"augmentedPropertyMenu.settings.modal.importModal.setting.placeholder"
						)
					)
					.onChange((v) => (jsonText = v))
			);

		this.createButtonContainer();
		this.createFooterButton((cmp) =>
			cmp
				.setButtonText(text("buttonText.cancel"))
				.onClick(() => this.close())
		).createFooterButton((cmp) =>
			cmp
				.setCta()
				.setButtonText("import")
				.onClick(() => {
					try {
						const json = JSON.parse(jsonText);
						const parsed = PropertySettingsSchema.parse(json);
						this.close();
						this.updateForm(parsed);
					} catch (e) {
						new Notice(text("notices.invalidJSON"));
						console.error(e);
					}
				})
		);
	}
}
