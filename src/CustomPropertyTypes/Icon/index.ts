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

export const typeKey = "icon" satisfies CustomTypeKey;

export const iconPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.icon.name"),
	icon: "lucide-badge-info",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const iconSettingsSchema = v.optional(
	v.object({
		// icon: v.optional(v.string()),
		// count: v.optional(v.number()),
	})
) satisfies PropertyTypeSchema;
