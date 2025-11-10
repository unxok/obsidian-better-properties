import { text } from "~/i18next";
import {
	CustomPropertyType,
	CustomTypeKey,
	PropertyTypeSchema,
} from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import * as v from "valibot";

export const typeKey = "relation" satisfies CustomTypeKey;

export const relationPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.relation.name"),
	icon: "lucide-arrow-up-right",
	validate: (v) => Array.isArray(v),
	registerListeners,
	renderSettings,
	renderWidget,
};

export const relationSettingsSchema = v.optional(
	v.object({
		relatedProperty: v.optional(v.string()),
	})
) satisfies PropertyTypeSchema;
