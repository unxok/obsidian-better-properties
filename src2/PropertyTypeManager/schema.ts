import * as v from "valibot";
import { vOptionalObject } from "#/utils/valibot";

import toggle from "./customPropertyTypes/Toggle/settingsSchema";

/**
 * The property settings schema
 */
export const propertySettingsSchema = v.object({
	types: vOptionalObject(
		v.object({
			toggle: vOptionalObject(toggle),
		})
	),
});

/**
 * Settings for a given property name
 */
export type PropertySettings = v.InferOutput<typeof propertySettingsSchema>;

/**
 * The keys defined for each custom property type in the settings schema
 */
export type CustomPropertyTypeKey = keyof PropertySettings["types"];
