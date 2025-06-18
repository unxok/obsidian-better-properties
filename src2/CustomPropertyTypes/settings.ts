import { Notice, PropertyWidget, Setting, TextAreaComponent } from "obsidian";
import { VerticalTabModal } from "~/Classes/VerticalTabModal";
import BetterProperties from "~/main";
import {
	deletePropertySettings,
	getDefaultPropertySettings,
	getPropertySettings,
	getPropertyTypeSettings,
	setPropertySettings,
	updatePropertyTypeSettings,
	withoutTypeWidgetPrefix,
} from "./utils";
import { CustomPropertyType, CustomTypeKey, PropertySettings } from "./types";
import { customPropertyTypesRecord } from "./register";
import { getPropertyType, tryCatch } from "~/lib/utils";
import { refreshPropertyEditor } from "~/MetadataEditor";
import { Icon } from "~/lib/types/icons";
import { ConfirmationModal } from "~/Classes/ConfirmationModal";
import { propertySettingsSchema } from "./schema";

export class PropertySettingsModal extends VerticalTabModal {
	public propertyType: string = "unset";

	constructor(public plugin: BetterProperties, public property: string) {
		super(plugin.app);
	}

	getTabViewTitle(): string {
		return this.property;
	}

	onOpen(): void {
		this.propertyType = getPropertyType(this.plugin.app, this.property);
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
				.setTitle("General")
				.addTab((tab) =>
					tab
						.setTitle("Settings")
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
			group.setTitle("Type settings").then((group) => {
				Object.values(this.plugin.app.metadataTypeManager.registeredTypeWidgets)
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
	type GeneralSettings = NonNullable<PropertySettings["general"]>;
	const update = <K extends keyof GeneralSettings>(
		key: K,
		value: GeneralSettings[K]
	) => {
		updatePropertyTypeSettings({
			plugin,
			property,
			type: "general",
			cb: (prev) => {
				const obj = prev ?? getDefaultPropertySettings().general;
				return { ...obj, [key]: value };
			},
		});
	};

	new Setting(tabContentEl)
		.setName("Icon")
		.setDesc("Set a custom icon to show for this property")
		.addSearch((cmp) =>
			cmp.setValue(settings?.icon ?? "").onChange((v) => update("icon", v))
		);
};

const handleActionsTab = ({
	modal,
	tab,
}: {
	modal: PropertySettingsModal;
	tab: PropertySettingsModal["tabGroups"][number]["tabs"][number];
}) => {
	const { tabContentEl, plugin, property } = modal;
	tab.setTitle("Actions").onSelect(() => {
		tabContentEl.empty();
		new Setting(tabContentEl)
			.setName("Import")
			.setDesc(
				"Paste settings as JSON. This will completely overwrite any existing settings for this property!"
			)
			.addButton((cmp) =>
				cmp
					.setIcon("lucide-import" satisfies Icon)
					.onClick(() => showImportModal(modal))
			);

		new Setting(tabContentEl)
			.setName("Export")
			.setDesc("Copy this property's settings as JSON")
			.addButton((btn) =>
				btn.setIcon("lucide-copy" satisfies Icon).onClick(() => {
					const settings = getPropertySettings({
						plugin,
						property,
					});
					const str = JSON.stringify(settings, null, 2);
					navigator.clipboard.writeText(str);
					new Notice("Copied settings to clipboard!");
				})
			);

		new Setting(tabContentEl)
			.setName("Reset")
			.setDesc("Completely wipe all settings for this property")
			.addButton((btn) =>
				btn
					.setWarning()
					.setIcon("lucide-archive" satisfies Icon)
					.onClick(() => showResetModal(modal))
			);
	});
};

const showImportModal = (modal: PropertySettingsModal) => {
	const { plugin, property } = modal;
	const confirmationModal = new ConfirmationModal(plugin.app);
	confirmationModal.setTitle("Import property settings");
	let data: undefined | PropertySettings = undefined;

	new TextAreaComponent(confirmationModal.contentEl)
		.setPlaceholder("{ general: {}, ...}")
		.then((textArea) => {
			textArea.inputEl.classList.add("better-properties-mod-w-full");
			textArea.inputEl.setAttribute("rows", "7");
			textArea.onChange(async (v) => {
				const jsonResult = await tryCatch(() => JSON.parse(v));
				if (!jsonResult.success) {
					data = undefined;
					validityEl.setAttribute("data-is-valid", "false");
					validityEl.textContent = "JSON parse error: " + jsonResult.error;
					return;
				}
				const parsed = propertySettingsSchema.safeParse(jsonResult.data);
				if (!parsed.success) {
					data = undefined;
					validityEl.setAttribute("data-is-valid", "false");
					validityEl.textContent =
						"Parse error: Data does not conform to expected structure. Check developer console for more details.";
					console.error(parsed.error);
					return;
				}

				validityEl.setAttribute("data-is-valid", "true");
				validityEl.textContent = "Data is valid";
				data = parsed.data;
			});
		});

	const validityEl = confirmationModal.contentEl.createEl("p", {
		cls: "better-properties-validity",
	});

	confirmationModal
		.addFooterButton((btn) =>
			btn
				.setButtonText("Import")
				.setWarning()
				.onClick(() => {
					if (!data) return;
					setPropertySettings({
						plugin,
						property,
						settings: data,
					});

					confirmationModal.close();
					new Notice("Property settings updated");
				})
		)
		.addFooterButton((btn) =>
			btn.setButtonText("Cancel").onClick(() => confirmationModal.close())
		);

	confirmationModal.open();
};

const showResetModal = (modal: PropertySettingsModal) => {
	const { app, plugin, property } = modal;
	const confirmationModal = new ConfirmationModal(app)
		.setTitle("Are you sure?")
		.setContent(
			"This will reset this property's settings which cannot be undone"
		)
		.setFooterCheckbox((checkbox) =>
			checkbox
				.setLabel("Don't ask again")
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
				.setButtonText("Reset")
				.setWarning()
				.onClick(() => {
					deletePropertySettings({ plugin, property });
					confirmationModal.close();
				})
		)
		.addFooterButton((btn) =>
			btn.setButtonText("Cancel").onClick(() => confirmationModal.close())
		);
	confirmationModal.open();
};

const handlePropertyTypeTab = ({
	modal,
	widget,
	tab,
}: {
	modal: PropertySettingsModal;
	widget: PropertyWidget<unknown>;
	tab: PropertySettingsModal["tabGroups"][number]["tabs"][number];
}) => {
	const { tabContentEl, plugin, property, propertyType } = modal;
	const customPropertyType: CustomPropertyType<any> | undefined =
		customPropertyTypesRecord[
			withoutTypeWidgetPrefix(widget.type) as CustomTypeKey
		];
	tab
		.setTitle(widget.name())
		.onSelect(() => {
			tabContentEl.empty();

			if (!customPropertyType) {
				new Setting(tabContentEl)
					.setName("Unsupported type")
					.setHeading()
					.setDesc(
						`The assigned type of "${widget.type}" is not supported for type-specific settings. This is likely because it is a built-in type or it was added by a different plugin than Better Properties`
					);
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
