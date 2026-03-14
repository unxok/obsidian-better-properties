import { PluginSettingTab } from "obsidian";
import * as v from "valibot";
import { BetterProperties } from "./plugin";
import { propertySettingsSchema } from "#/PropertyTypeManager/schema";

/**
 * Base schema for the plugin settings to enforce that all setttings must be optional
 */
export type BetterPropertiesSettingsSchemaBase = v.ObjectSchema<
	Record<string, v.OptionalSchema<v.GenericSchema, {}>>,
	undefined
>;

/**
 * The plugin settings schema
 *
 * @warning Be very careful when changing this as it may invalidate users' existing settings data
 */
export const betterPropertiesSettingsSchema = v.object({
	foo: v.optional(v.string(), "bar"),
	propertySettings: v.optional(
		v.record(v.string(), propertySettingsSchema),
		{}
	),
}) satisfies BetterPropertiesSettingsSchemaBase;

/**
 * The plugin settings
 */
export type BetterPropertiesSettings = v.InferOutput<
	typeof betterPropertiesSettingsSchema
>;

/**
 * The class for rendering the plugin settings tab in the obsidian settings modal
 */
export class BetterPropertiesSettingsTab extends PluginSettingTab {
	constructor(public plugin: BetterProperties) {
		super(plugin.app, plugin);
	}

	display(): void {
		this.containerEl.empty();
	}
}
