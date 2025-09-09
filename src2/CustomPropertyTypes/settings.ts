import { Notice, Setting, setTooltip, TextAreaComponent } from "obsidian";
import { VerticalTabModal } from "~/Classes/VerticalTabModal";
import BetterProperties from "~/main";
import {
	deletePropertySettings,
	getPropertySettings,
	getPropertyTypeSettings,
	setPropertySettings,
	setPropertyTypeSettings,
	withoutTypeWidgetPrefix,
} from "./utils";
import { CustomPropertyType, CustomTypeKey, PropertySettings } from "./types";
import { customPropertyTypesRecord } from "./register";
import { tryCatch } from "~/lib/utils";
import { refreshPropertyEditor } from "~/MetadataEditor";
import { Icon } from "~/lib/types/icons";
import { ConfirmationModal } from "~/Classes/ConfirmationModal";
import { propertySettingsSchema } from "./schema";
import { IconSuggest } from "~/Classes/InputSuggest/IconSuggest";
import { PropertyWidget } from "obsidian-typings";
import { text } from "~/i18next";
import { obsidianText } from "~/i18next/obsidian";
import { MultiselectComponent } from "~/Classes/MultiSelect";
import * as v from "valibot";

export class PropertySettingsModal extends VerticalTabModal {
	public propertyType: string = "unset";

	constructor(public plugin: BetterProperties, public property: string) {
		super(plugin.app);
	}

	getTabViewTitle(): string {
		return this.property;
	}

	onOpen(): void {
		this.propertyType =
			this.plugin.app.metadataTypeManager.getAssignedWidget(this.property) ??
			"text";
		this.addTabGroup((group) => {
			group.setTitle(this.property);
			group.titleEl.classList.add("better-properties-vertical-tab-modal-title");
			setTooltip(group.titleEl, this.property);
		});
		this.addGeneralTabGroup();
		this.addTypesTabGroup();
	}

	onClose(): void {
		super.onClose.call(this);
		refreshPropertyEditor(this.plugin, this.property);
	}

	addGeneralTabGroup() {
		const { propertyType } = this;

		this.addTabGroup((group) =>
			group
				.setTitle(text("propertySettings.generalTabGroupName"))
				.addTab((tab) =>
					tab
						.setTitle(text("propertySettings.generalSettingsTab.name"))
						.onSelect(() => renderGeneralSettings(this))
						.then((tab) => {
							if (
								withoutTypeWidgetPrefix(propertyType) in
								customPropertyTypesRecord
							)
								return;
							// select general tab because current type is unsupported
							tab.select();
						})
				)
				.addTab((tab) => handleActionsTab({ modal: this, tab }))
		);
	}

	addTypesTabGroup() {
		this.addTabGroup((group) =>
			group
				.setTitle(text("propertySettings.typesTabGroup.name"))
				.then((group) => {
					Object.values(
						this.plugin.app.metadataTypeManager.registeredTypeWidgets
					)
						.toSorted((a, b) => a.name().localeCompare(b.name()))
						.forEach((widget) => {
							group.addTab((tab) =>
								handlePropertyTypeTab({
									widget,
									tab,
									modal: this,
								})
							);
						});
				})
		);
	}
}

//////////////////////////////////////////////////////////
//                      utils                           //
//////////////////////////////////////////////////////////

export const showPropertySettingsModal = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	new PropertySettingsModal(plugin, property).open();
};

const renderGeneralSettings = (modal: PropertySettingsModal) => {
	const { tabContentEl, plugin, property } = modal;
	tabContentEl.empty();

	const settings = getPropertyTypeSettings({
		plugin,
		property,
		type: "general",
	});

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property,
			type: "general",
			typeSettings: settings,
		});
	});

	new Setting(tabContentEl)
		.setName(text("propertySettings.generalSettingsTab.iconSetting.title"))
		.setDesc(text("propertySettings.generalSettingsTab.iconSetting.desc"))
		.addSearch((search) => {
			search.setValue(settings?.icon ?? "").onChange((v) => {
				settings.icon = v;
			});
			new IconSuggest(plugin.app, search.inputEl).onSelect((v) => {
				search.setValue(v);
				search.onChanged();
			});
		});

	new Setting(tabContentEl)
		.setName(text("propertySettings.generalSettingsTab.hiddenSetting.title"))
		.setDesc(text("propertySettings.generalSettingsTab.hiddenSetting.desc"))
		.addToggle((toggle) =>
			toggle.setValue(settings.hidden ?? false).onChange((b) => {
				settings.hidden = b;
			})
		);

	new Setting(tabContentEl)
		.setName(
			text("propertySettings.generalSettingsTab.defaultValueSetting.title")
		)
		.setDesc(
			text("propertySettings.generalSettingsTab.defaultValueSetting.desc")
		)
		.addTextArea((cmp) => {
			cmp.setValue(settings.defaultValue ?? "").onChange((v) => {
				settings.defaultValue = v;
			});
			cmp.inputEl.setAttribute("rows", "3");
			cmp.inputEl.setAttribute("cols", "40");
		});

	// new Setting(tabContentEl)
	// 	.setName("On-load script")
	// 	.setDesc("")

	new Setting(tabContentEl)
		.setName(text("propertySettings.generalSettingsTab.aliasSetting.title"))
		.setDesc(text("propertySettings.generalSettingsTab.aliasSetting.desc"))
		.addText((cmp) => {
			cmp.setValue(settings.alias ?? "").onChange((v) => {
				settings.alias = v;
			});
		});

	new Setting(tabContentEl)
		.setName(
			text("propertySettings.generalSettingsTab.suggestionsSetting.title")
		)
		.setDesc(
			text("propertySettings.generalSettingsTab.suggestionsSetting.desc")
		)
		.then((s) => {
			new MultiselectComponent(s)
				.setValues(settings.suggestions ?? [])
				.onChange((v) => {
					settings.suggestions = [...v];
				})
				.renderValues();
		});
};

const handleActionsTab = ({
	modal,
	tab,
}: {
	modal: PropertySettingsModal;
	tab: PropertySettingsModal["tabGroups"][number]["tabs"][number];
}) => {
	const { tabContentEl, plugin, property } = modal;
	tab.setTitle(text("propertySettings.generalActionsTab.name")).onSelect(() => {
		tabContentEl.empty();
		new Setting(tabContentEl)
			.setName(text("propertySettings.generalActionsTab.importSetting.title"))
			.setDesc(text("propertySettings.generalActionsTab.importSetting.desc"))
			.addButton((cmp) =>
				cmp
					.setIcon("lucide-import" satisfies Icon)
					.onClick(() => showImportModal(modal))
			);

		new Setting(tabContentEl)
			.setName(text("propertySettings.generalActionsTab.exportSetting.title"))
			.setDesc(text("propertySettings.generalActionsTab.exportSetting.desc"))
			.addButton((btn) =>
				btn.setIcon("lucide-copy" satisfies Icon).onClick(() => {
					const settings = getPropertySettings({
						plugin,
						property,
					});
					const str = JSON.stringify(settings, null, 2);
					navigator.clipboard.writeText(str);
					new Notice(
						text(
							"propertySettings.generalActionsTab.exportSetting.copySuccessNotice"
						)
					);
				})
			);

		new Setting(tabContentEl)
			.setName(text("propertySettings.generalActionsTab.resetSetting.title"))
			.setDesc(text("propertySettings.generalActionsTab.resetSetting.desc"))
			.addButton((btn) =>
				btn
					.setWarning()
					.setIcon("lucide-archive" satisfies Icon)
					.onClick(() => {
						if (plugin.settings.confirmPropertySettingsReset ?? true) {
							showResetModal(modal);
						}
					})
			);
	});
};

const showImportModal = (modal: PropertySettingsModal) => {
	const { plugin, property } = modal;
	const confirmationModal = new ConfirmationModal(plugin.app);
	confirmationModal.setTitle(
		text("propertySettings.generalActionsTab.importSetting.modalTitle")
	);
	let data: undefined | PropertySettings = undefined;

	new TextAreaComponent(confirmationModal.contentEl)
		.setPlaceholder("{ general: {}, ...}")
		.then((textArea) => {
			textArea.inputEl.classList.add("better-properties-mod-w-full");
			textArea.inputEl.setAttribute("rows", "7");
			textArea.onChange(async (val) => {
				const jsonResult = await tryCatch(() => JSON.parse(val));
				if (!jsonResult.success) {
					data = undefined;
					validityEl.setAttribute("data-is-valid", "false");
					validityEl.textContent = text(
						"propertySettings.generalActionsTab.importSetting.modalJsonParseError",
						{ error: jsonResult.error }
					);
					return;
				}
				const parsed = v.safeParse(propertySettingsSchema, jsonResult.data);
				if (!parsed.success) {
					data = undefined;
					validityEl.setAttribute("data-is-valid", "false");
					validityEl.textContent = text(
						"propertySettings.generalActionsTab.importSetting.modalStrutureParseError"
					);
					console.log(parsed.issues);
					return;
				}

				validityEl.setAttribute("data-is-valid", "true");
				validityEl.textContent = text(
					"propertySettings.generalActionsTab.importSetting.modalDataIsValid"
				);
				data = parsed.output;
			});
		});

	const validityEl = confirmationModal.contentEl.createEl("p", {
		cls: "better-properties-validity",
	});

	confirmationModal
		.addFooterButton((btn) =>
			btn
				.setButtonText(text("common.import"))
				.setWarning()
				.onClick(() => {
					if (!data) return;
					setPropertySettings({
						plugin,
						property,
						settings: data,
					});

					confirmationModal.close();
					new Notice(
						text(
							"propertySettings.generalActionsTab.importSetting.modalImportSuccess"
						)
					);
				})
		)
		.addFooterButton((btn) =>
			btn
				.setButtonText(obsidianText("dialogue.button-cancel"))
				.onClick(() => confirmationModal.close())
		);

	confirmationModal.open();
};

const showResetModal = (modal: PropertySettingsModal) => {
	const { app, plugin, property } = modal;
	const confirmationModal = new ConfirmationModal(app)
		.setTitle(
			text("propertySettings.generalActionsTab.resetSetting.modalTitle")
		)
		.setContent(
			text("propertySettings.generalActionsTab.resetSetting.modalDesc")
		)
		.setFooterCheckbox((checkbox) =>
			checkbox
				.setLabel(text("common.dontAskAgain"))
				.setValue(false)
				.onChange((v) => {
					modal.plugin.updateSettings((prev) => ({
						...prev,
						confirmPropertySettingsReset: v,
					}));
				})
		)
		.addFooterButton((btn) =>
			btn
				.setButtonText(text("common.reset"))
				.setWarning()
				.onClick(() => {
					deletePropertySettings({ plugin, property });
					confirmationModal.close();
				})
		)
		.addFooterButton((btn) =>
			btn
				.setButtonText(obsidianText("dialogue.button-cancel"))
				.onClick(() => confirmationModal.close())
		);
	confirmationModal.open();
};

const handlePropertyTypeTab = ({
	modal,
	widget,
	tab,
}: {
	modal: PropertySettingsModal;
	widget: PropertyWidget;
	tab: PropertySettingsModal["tabGroups"][number]["tabs"][number];
}) => {
	const { tabContentEl, plugin, property, propertyType } = modal;
	const customPropertyType: CustomPropertyType | undefined =
		customPropertyTypesRecord[
			withoutTypeWidgetPrefix(widget.type) as CustomTypeKey
		];
	tab
		.setTitle(widget.name())
		.onSelect(() => {
			tabContentEl.empty();

			if (!customPropertyType) {
				new Setting(tabContentEl)
					.setName(text("propertySettings.typesTabGroup.unsupportedTypeTitle"))
					.setHeading()
					.setDesc(text("propertySettings.typesTabGroup.unsupportedTypeDesc"));
				return;
			}
			customPropertyType.renderSettings({
				plugin,
				modal,
				property,
			});
		})
		.then((tab) => {
			if (!customPropertyType) {
				tab.labelEl.classList.add("better-properties-mod-unsupported");
			}
			if (propertyType === widget.type) {
				tab.labelEl.classList.add("better-properties-mod-active");
				tab.select();
			}
		});
};
