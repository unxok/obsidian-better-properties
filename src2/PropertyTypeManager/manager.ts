import { BetterProperties } from "#/Plugin";
import { Component } from "obsidian";
import { CustomPropertyType } from "./types";
import toggle from "./customPropertyTypes/Toggle";
import {} from "#/Plugin/settings";
import * as v from "valibot";
import {
	CustomPropertyTypeKey,
	PropertySettings,
	propertySettingsSchema,
} from "./schema";

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
	}

	onunload(): void {
		this.unregisterCustomPropertyTypes();
		this.unsortPropertyTypes();
	}

	/**
	 * The text which prefixes the type keys for property types added by BetterProperties
	 */
	typePrefix = "betterproperties:";

	/**
	 * Registers a custom property type. Type names are prefixed with {@link typePrefix}
	 */
	registerCustomPropertyType<T extends CustomPropertyTypeKey>({
		type,
		info,
	}: {
		type: T;
		info: CustomPropertyType<T>;
	}) {
		const { plugin, typePrefix } = this;

		const widget = info.getWidget({
			plugin,
			getSettings: (propertyName) =>
				this.getPropertySettings(propertyName).types[type],
			setSettings: async (propertyName, settings) =>
				this.updatePropertySettings(propertyName, (prev) => ({
					...prev,
					types: { ...prev.types, [type]: settings },
				})),
			updateSettings: (propertyName, callback) =>
				this.updatePropertySettings(propertyName, (prev) => ({
					...prev,
					types: {
						...prev.types,
						[type]: callback(prev.types[type]),
					},
				})),
		});
		const prefixedType = typePrefix + type;
		plugin.app.metadataTypeManager.registeredTypeWidgets[prefixedType] = {
			...widget,
			type: prefixedType,
			render: (...args) => {
				const cmp = widget.render(...args);
				return {
					type: prefixedType,
					focus: cmp.focus,
				};
			},
		};
	}

	/**
	 * Custom Property Types provided by BetterProperties
	 */
	static customPropertyTypes = {
		toggle,
	} satisfies Record<
		CustomPropertyTypeKey,
		CustomPropertyType<CustomPropertyTypeKey>
	>;

	/**
	 * Registers all property types within {@link customPropertyTypes}
	 */
	registerCustomPropertyTypes(): void {
		Object.entries(PropertyTypeManager.customPropertyTypes).forEach(
			([t, info]) => {
				const type = t as keyof typeof PropertyTypeManager.customPropertyTypes;
				this.registerCustomPropertyType({
					type,
					info,
				});
			}
		);
	}

	/**
	 * Deletes all registered property types which start with {@link typePrefix}
	 */
	unregisterCustomPropertyTypes(): void {
		const { registeredTypeWidgets } = this.plugin.app.metadataTypeManager;
		Object.keys(registeredTypeWidgets).forEach((key) => {
			if (!key.startsWith(this.typePrefix)) return;
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
		const settings = this.plugin.getSettings();
		const propertySettings = settings.propertySettings[propertyName];
		if (!propertySettings) {
			return v.parse(propertySettingsSchema, {});
		}

		return propertySettings;
	}

	/**
	 * Set the settings for a given property
	 */
	async setPropertySettings(
		propertyName: string,
		settings: PropertySettings
	): Promise<void> {
		this.plugin.updateSettings((prev) => ({
			...prev,
			propertySettings: {
				...prev.propertySettings,
				[propertyName]: { ...settings },
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

	openPropertySettingsModal() {}
}
