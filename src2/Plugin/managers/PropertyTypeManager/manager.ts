import { BetterProperties } from "#/Plugin";
import {
	Component,
	FileManager,
	Modal,
	Notice,
	Setting,
	SettingGroup,
} from "obsidian";
import { CustomPropertyType } from "./types";
import * as v from "valibot";
import {
	CustomPropertyTypeKey,
	PropertySettings,
	propertySettingsSchema,
} from "./schema";
import {
	parseObjectPathString,
	setValueByKeys,
	syncTryCatch,
	tryCatch,
} from "#/lib/utils";
import { around, dedupe } from "monkey-around";
import { customPropertyTypePrefix, monkeyAroundKey } from "~/lib/constants";
import { PropertyRenderContext } from "obsidian-typings";
import {
	createActionsSettingsGroup,
	setSettingIcon,
	triggerPropertyTypeChange,
} from "#/lib/obsidian";
import { t } from "#/i18n";
import "./manager.css";

import formula from "./customPropertyTypes/Formula";
import select from "./customPropertyTypes/Select";
import toggle from "./customPropertyTypes/Toggle";
import { ConfirmationModal } from "~/classes/ConfirmationModal";

/**
 * Responsible for property-type-related features such as:
 * - registering custom types to the MetadataTypeManager
 * - re-ordering property types to affect their order in the UI
 * - utils for managing property settings
 */
export class PropertyTypeManager extends Component {
	constructor(public plugin: BetterProperties) {
		super();
	}

	onload(): void {
		this.registerCustomPropertyTypes();
		this.sortPropertyTypes();
		this.patchFileManagerProcessFrontMatter();

		if (this.plugin.app.workspace.layoutReady) {
			this.plugin.rebuildLeaves();
		}
	}

	onunload(): void {
		this.unregisterCustomPropertyTypes();
		this.unsortPropertyTypes();
	}

	/**
	 * Registers a custom property type. Type names are prefixed with {@link customPropertyTypePrefix}
	 */
	registerCustomPropertyType<T extends CustomPropertyTypeKey>({
		type,
		info,
	}: {
		type: T;
		info: CustomPropertyType;
	}) {
		const { plugin } = this;

		const render = (
			containerEl: HTMLElement,
			data: unknown,
			context: PropertyRenderContext
		) =>
			info.renderWidget({
				plugin,
				containerEl,
				data,
				context,
			});

		const { name, icon, validate, reservedKeys } = info;

		plugin.app.metadataTypeManager.registeredTypeWidgets[type] = {
			type,
			name,
			icon,
			validate,
			reservedKeys,
			render: (...args) => {
				const cmp = render(...args);
				return {
					type: type,
					focus: (mode) => cmp.focus(mode),
				};
			},
		};
	}

	/**
	 * Custom Property Types provided by BetterProperties
	 */
	customPropertyTypes = {
		"better-properties:formula": formula,
		"better-properties:select": select,
		"better-properties:toggle": toggle,
	} satisfies Record<CustomPropertyTypeKey, CustomPropertyType>;

	/**
	 * Registers all property types within {@link customPropertyTypes}
	 */
	registerCustomPropertyTypes(): void {
		Object.entries(this.customPropertyTypes).forEach(([t, info]) => {
			const type = t as keyof typeof this.customPropertyTypes;
			this.registerCustomPropertyType({
				type,
				info,
			});
		});
	}

	/**
	 * Deletes all registered property types which start with {@link typePrefix}
	 */
	unregisterCustomPropertyTypes(): void {
		const { registeredTypeWidgets } = this.plugin.app.metadataTypeManager;
		Object.keys(registeredTypeWidgets).forEach((key) => {
			if (!key.startsWith(customPropertyTypePrefix)) return;
			delete registeredTypeWidgets[key];
		});
	}

	/**
	 * Reorders the MetadataTypeManager's registered property types. This changes the order the types are presented in the UI
	 */
	sortPropertyTypes(): void {
		const { metadataTypeManager } = this.plugin.app;
		this.originalSortOrder = Object.keys(
			metadataTypeManager.registeredTypeWidgets
		);
		metadataTypeManager.registeredTypeWidgets = Object.entries(
			metadataTypeManager.registeredTypeWidgets
		)
			.toSorted((a, b) => {
				return a[1].name().localeCompare(b[1].name());
			})
			.reduce(
				(acc, [key, value]) => ({ ...acc, [key]: value }),
				{} as typeof metadataTypeManager.registeredTypeWidgets
			);
	}

	/**
	 * The original order of the registered types' keys
	 */
	originalSortOrder: string[] = [];

	/**
	 * Reorders the MetadataTypeManager's registered property types back to their original order
	 */
	unsortPropertyTypes(): void {
		const { metadataTypeManager } = this.plugin.app;
		metadataTypeManager.registeredTypeWidgets = Object.entries(
			metadataTypeManager.registeredTypeWidgets
		)
			.toSorted((a, b) => {
				return (
					this.originalSortOrder.indexOf(a[0]) -
					this.originalSortOrder.indexOf(b[0])
				);
			})
			.reduce(
				(acc, [key, value]) => ({ ...acc, [key]: value }),
				{} as typeof metadataTypeManager.registeredTypeWidgets
			);
	}

	/**
	 * Get the settings for a given property
	 */
	getPropertySettings(propertyName: string): PropertySettings {
		const lowerPropertyName = propertyName.toLowerCase();
		const settings = this.plugin.getSettings();
		const propertySettings = settings.propertySettings[lowerPropertyName];
		if (!propertySettings) {
			const parsed = v.parse(propertySettingsSchema, {});
			if (lowerPropertyName === "") return parsed;

			const defaultSettings = settings.propertySettings[""];
			if (!defaultSettings) return parsed;

			return { ...parsed, ...defaultSettings };
		}

		return propertySettings;
	}

	/**
	 * Set the type settings for a given property
	 */
	getPropertyTypeSettings<T extends CustomPropertyTypeKey>(
		propertyName: string,
		type: T
	): PropertySettings["types"][T] {
		const settings = this.getPropertySettings(propertyName);
		return settings.types[type];
	}

	/**
	 * Set the settings for a given property
	 */
	async setPropertySettings(
		propertyName: string,
		settings: PropertySettings
	): Promise<void> {
		const lowerPropertyName = propertyName.toLowerCase();
		await this.plugin.updateSettings((prev) => ({
			...prev,
			propertySettings: {
				...prev.propertySettings,
				[lowerPropertyName]: { ...settings },
			},
		}));
	}

	/**
	 * Update the settings for a given property with a callback
	 */
	async updatePropertySettings(
		propertyName: string,
		callback: (settings: PropertySettings) => PropertySettings
	) {
		const settings = this.getPropertySettings(propertyName);
		await this.setPropertySettings(propertyName, callback(settings));
	}

	async updatePropertyTypeSettings<T extends CustomPropertyTypeKey>(
		propertyName: string,
		type: T,
		callback: (
			settings: PropertySettings["types"][T]
		) => PropertySettings["types"][T]
	) {
		const settings = this.getPropertyTypeSettings(propertyName, type);
		await this.updatePropertySettings(propertyName, (s) => ({
			...s,
			types: {
				...s.types,
				[type]: callback(settings),
			},
		}));
		// triggerPropertyTypeChange(
		// 	this.plugin.app.metadataTypeManager,
		// 	propertyName
		// );
	}

	/**
	 * Open the settings modal for a given property
	 */
	openPropertySettingsModal(propertyName: string) {
		const { app } = this.plugin;
		const modal = new Modal(app);
		modal.setTitle("Property settings");
		modal.contentEl.createEl("div", {}, (div) => {
			div.createDiv({ text: `property: ${propertyName}` });
			div.createEl("br");
		});
		const { contentEl } = modal;

		const assignedWidget =
			app.metadataTypeManager.getAssignedWidget(propertyName);

		const unnamedSettingsGroup = new SettingGroup(contentEl).addSetting((s) => {
			s.setName("General settings")

				// TODO this felt like unnecessary clutter... might add back later
				// .addExtraButton((button) => {
				// 	button
				// 		.setIcon("lucide-book-open")
				// 		.setTooltip(text("common.openDocumentation", { href: "TODO" }))
				// 		.onClick(() => {
				// 			openLink("TODO");
				// 		});
				// })
				.addExtraButton((button) => {
					button
						.setIcon("lucide-settings")
						.setTooltip(t("common.openSettings"));
				});
		});

		if (assignedWidget && assignedWidget in this.customPropertyTypes) {
			unnamedSettingsGroup.addSetting((setting) => {
				this.renderPropertyTypeSetting({
					setting,
					propertyName,
					type: assignedWidget as CustomPropertyTypeKey,
				});
			});
		}

		const otherTypesSettingsGroup = new SettingGroup(contentEl).setHeading(
			"Other types"
		);

		Object.keys(this.customPropertyTypes).forEach((type) => {
			if (type === assignedWidget) return;
			otherTypesSettingsGroup.addSetting((setting) => {
				setting.addExtraButton((button) => {
					button.extraSettingsEl.classList.add(
						"better-properties--update-property-button"
					);
					button
						.setIcon("lucide-check")
						.setTooltip("Update property to this type")
						.onClick(async () => {
							await app.metadataTypeManager.setType(propertyName, type);
							modal.close();
							this.openPropertySettingsModal(propertyName);
						});
				});
				this.renderPropertyTypeSetting({
					setting,
					propertyName,
					type: type as CustomPropertyTypeKey,
				});
			});
		});

		modal.open();
	}

	/**
	 * Renders a Settings for a given property type
	 */
	renderPropertyTypeSetting({
		setting,
		propertyName,
		type,
	}: {
		setting: Setting;
		propertyName: string;
		type: CustomPropertyTypeKey;
	}): Setting {
		const info = this.customPropertyTypes[type];
		if (!info) {
			throw new Error(`"${type}" is not a valid custom property type`);
		}

		setting.settingEl.classList.add("better-propertpes--property-type-setting");

		setting.setName(info.name());

		setSettingIcon(setting, info.icon);

		// TODO this felt like unnecessary clutter... might add back later
		// setting.addExtraButton((button) =>
		// 	button
		// 		.setIcon("lucide-book-open")
		// 		.setTooltip(text("common.openDocumentation", { href: info.docsLink }))
		// 		.onClick(() => {
		// 			openLink(info.docsLink);
		// 		})
		// );

		setting.addButton((button) => {
			button
				.setIcon("lucide-settings")
				.setTooltip(t("common.openSettings"))
				.onClick(() => {
					this.openPropertyTypeSettingsModal({
						propertyName,
						type,
					});
				});
		});

		return setting;
	}

	/**
	 * Opens a modal to edit the property type settings for a given type name and property name
	 */
	openPropertyTypeSettingsModal({
		propertyName,
		type,
	}: {
		propertyName: string;
		type: string;
	}) {
		const modal = new Modal(this.plugin.app);

		modal.onOpen = () => {
			if (!(type in this.customPropertyTypes)) {
				throw new Error(`"${type}" is not a registered custom type`);
			}
			const typedType = type as CustomPropertyTypeKey;
			const widget =
				this.plugin.app.metadataTypeManager.registeredTypeWidgets[type];

			if (!widget) {
				throw new Error(`"${typedType}" is not a registered type widget`);
			}

			const matchedInfo = this.customPropertyTypes[typedType];
			if (!matchedInfo) {
				new Setting(modal.contentEl).setName(
					`No settings found for type "${typedType}"`
				);
				return;
			}

			modal.setTitle("Property type settings");
			modal.contentEl.createEl(
				"div",
				{ cls: "better-properties--property-type-settings-modal-desc" },
				(div) => {
					div.createDiv({ text: `Property: ${propertyName}` });
					div.createDiv({ text: `Type: ${widget.name()}` });
				}
			);

			matchedInfo.renderSettings({
				plugin: this.plugin,
				containerEl: modal.contentEl,
				propertyName,
				modal,
			});

			const schema =
				propertySettingsSchema["wrapped"]["entries"]["types"]["wrapped"][
					"entries"
				][typedType];

			if (!schema) return;

			createActionsSettingsGroup({
				plugin: this.plugin,
				containerEl: modal.contentEl,
				documenationLink: matchedInfo.docsLink,
				onExport: async () => {
					const settings = this.getPropertyTypeSettings(
						propertyName,
						typedType
					);
					const str = JSON.stringify(settings, null, 2);
					const { error } = await tryCatch(navigator.clipboard.writeText(str));
					new Notice(error ?? t("common.copiedToClipboard"));
				},
				onImport: async (data) => {
					const parsed = v.parse(schema, data);
					await this.updatePropertyTypeSettings(
						propertyName,
						typedType,
						() => parsed
					);
					new Notice("Import successful");
				},
				onReset: async () => {
					await this.updatePropertyTypeSettings(propertyName, typedType, () =>
						v.parse(schema, {})
					);
				},
				validateImport: (data) => {
					const parsedJson = syncTryCatch(() => {
						return JSON.parse(data) as {};
					});
					if (!parsedJson.success) return parsedJson;

					const parsed = v.safeParse(schema, parsedJson.data);
					if (!parsed.success) {
						return {
							success: false,
							data: undefined,
							error: "Parsing error",
						};
					}

					return {
						success: true,
						data: parsed.output,
						error: undefined,
					};
				},
			});
		};

		modal.onClose = () => {
			triggerPropertyTypeChange(
				this.plugin.app.metadataTypeManager,
				propertyName
			);
		};

		modal.open();
	}

	/**
	 * Patches `FileManager.processFrontMatter()` to support updated nested objects and arrays in frontmatter.
	 *
	 * This enabled bases to correctly update frontmatter when accessing Object/Array sub-properties.
	 *
	 * ---
	 *
	 * ```ts
	 * app.fileManager.processFronmatter(file, fm => fm["foo.bar"] = "fizz");
	 * // {"foo.bar": "fizz"} --> {"foo": {"bar": "fizz"}}
	 *
	 * app.fileManager.processFronmatter(file, fm => fm["foo[0]"] = "fizz");
	 * // {"foo[0]": "fizz"} --> {"foo": ["fizz"]}
	 * ```
	 */
	patchFileManagerProcessFrontMatter(): void {
		const uninstall = around(this.plugin.app.fileManager, {
			processFrontMatter: (old) =>
				dedupe(monkeyAroundKey, old, function (file, callback) {
					// @ts-expect-error
					const that = this as FileManager;

					const newCallback = (fm: Record<string, unknown>) => {
						callback(fm);

						const objAccessKeys = Object.keys(fm).filter(
							(key) =>
								key.includes(".") || (key.includes("[") && key.includes("]"))
						);

						objAccessKeys.forEach((key) => {
							const value = fm[key];
							const keys = parseObjectPathString(key);

							setValueByKeys({
								obj: fm,
								keys,
								value,
								insensitive: true,
							});

							delete fm[key];
						});
					};

					return old.call(that, file, newCallback);
				}),
		});

		this.register(uninstall);
	}

	openRenamePropertyModal(property?: string): void {
		const modal = new ConfirmationModal(this.plugin.app);

		modal.setTitle("Rename property");
		modal.contentEl.createEl("p", {
			text: "The following changes will be made:",
		});
		modal.contentEl.createEl("ul", {}, (ul) => {
			ul.createEl("li", {
				text: "All notes containing the old name in their properties are updated to use the new name instead.",
			});
			ul.createEl("li", {
				text: "The assigned type of the new name is updated to match the old name's type, and then the old name's type is reset.",
			});
			ul.createEl("li", {
				text: "The property settings saved for the old name will be transferred to the new name",
			});
		});
		modal.contentEl.createEl("p", {
			text: "This will not update any formulas, filters, or other references to the old name.",
		});
		modal.contentEl.createEl("p", {
			text: "If the new name is already used in the properties of your notes and/or has property settings set, it will be overwritten with the data from the old name.",
			cls: "mod-warning",
		});
		modal.contentEl.createEl("p", {
			text: "This change is permanent and cannot be undone.",
			cls: "mod-warning",
		});

		let oldName = property ?? "";
		let newName = "";
		let setDisabled = (_isDisabled: boolean) => {};
		let updateDisabled = () => {
			setDisabled(
				oldName.toLowerCase() === newName.toLowerCase() || !oldName || !newName
			);
		};

		new Setting(modal.contentEl)
			.setName("Old property name")
			.setDesc("The current name of the property to be renamed.")
			.addText((textComponent) => {
				textComponent.setValue(oldName).onChange((v) => {
					oldName = v;
					updateDisabled();
				});
			});

		new Setting(modal.contentEl)
			.setName("New property name")
			.setDesc("The new name to rename the property to.")
			.addText((textComponent) => {
				textComponent.onChange((v) => {
					newName = v;
					updateDisabled();
				});
			});

		modal.addFooterButton((button) => {
			button.setButtonText("Cancel").onClick(() => {
				modal.close();
			});
		});
		modal.addFooterButton((button) => {
			setDisabled = (b) => {
				button.setDisabled(b);
			};
			button
				.setButtonText("Rename")
				.setWarning()
				.setDisabled(true)
				.onClick(async () => {
					await this.renameProperty(oldName, newName);
					modal.close();
				});
		});

		modal.open();
	}

	/**
	 * Rename a property such that:
	 * - All notes containing the old name are updated to use the new name
	 * - The type of the new name is updated to match the old name
	 * - The property settings are transferred from the old name to the new name
	 *
	 * Formulas and other references to the old name will NOT be updated
	 */
	async renameProperty(oldName: string, newName: string): Promise<void> {
		const { plugin } = this;
		const { metadataTypeManager, metadataCache, vault, fileManager } =
			plugin.app;

		await plugin.updateSettings((prev) => {
			const oldSettings = prev.propertySettings[oldName];
			if (!oldSettings) return prev;

			prev.propertySettings[newName] = { ...oldSettings };
			delete prev.propertySettings[oldName];
			return prev;
		});

		const assignedWidget = metadataTypeManager.getAssignedWidget(oldName);
		if (assignedWidget) {
			await metadataTypeManager.setType(newName, assignedWidget);
			await metadataTypeManager.unsetType(oldName);
		}

		const files = vault.getMarkdownFiles();
		files.forEach(async (file) => {
			const { frontmatter } = metadataCache.getFileCache(file) ?? {};
			if (!frontmatter) return;
			if (!(oldName in frontmatter)) return;

			await fileManager.processFrontMatter(file, (fm) => {
				const typedFm = fm as Record<string, unknown>;
				const lowerOldName = oldName.toLowerCase();

				const reconstructed: Record<string, unknown> = {};

				// Reconstruct the object to replace the old name and maintain the correct order
				Object.entries(typedFm).forEach(([key, value]) => {
					if (key.toLowerCase() !== lowerOldName) {
						reconstructed[key] = value;
						return;
					}
					reconstructed[newName] = typedFm[oldName];
				});

				// Remove all data from fm
				Object.keys(typedFm).forEach((key) => {
					delete typedFm[key];
				});

				// Reconstruct fm with the updated name
				Object.keys(reconstructed).forEach((key) => {
					typedFm[key] = reconstructed[key];
				});
			});
		});
	}
}
