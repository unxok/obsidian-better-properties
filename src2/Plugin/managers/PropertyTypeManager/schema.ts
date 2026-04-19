import * as v from "valibot";
import {
	VOptionalObjectWithDefault,
	vOptionalObjectWithDefault,
} from "#/lib/valibot";
import { customPropertyTypePrefix } from "~/lib/constants";

import formula from "./customPropertyTypes/Formula/settingsSchema";
import multiselect from "./customPropertyTypes/Multi-Select/settingsSchema";
import select from "./customPropertyTypes/Select/settingsSchema";
import toggle from "./customPropertyTypes/Toggle/settingsSchema";

/**
 * The settings schema for each custom property type
 */
const customPropertyTypeSettingsSchemas = {
	"better-properties:formula": formula,
	"better-properties:multiselect": multiselect,
	"better-properties:select": select,
	"better-properties:toggle": toggle,
	"test": vOptionalObjectWithDefault({}),
} satisfies Record<string, VOptionalObjectWithDefault>;

/**
 * The property settings schema
 */
export const propertySettingsSchema = vOptionalObjectWithDefault({
	types: vOptionalObjectWithDefault(customPropertyTypeSettingsSchemas),
}) satisfies VOptionalObjectWithDefault;

/**
 * Settings for a given property name
 */
export type PropertySettings = v.InferOutput<typeof propertySettingsSchema>;

/**
 * All keys in the property settings schema
 */
export type PropertyTypeSettingsKey = keyof PropertySettings["types"];

/**
 * The keys defined for each custom property type in the settings schema
 */
export type CustomPropertyTypeKey = Extract<
	PropertyTypeSettingsKey,
	`${typeof customPropertyTypePrefix}${string}`
>;
