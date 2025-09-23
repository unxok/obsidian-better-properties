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

export const typeKey = "array" satisfies CustomTypeKey;

export const arrayPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.array.name"),
	icon: "lucide-brackets",
	validate: (v) => typeof v === "object" && Array.isArray(v),
	registerListeners,
	renderSettings,
	renderWidget,
};

export const arraySettingsSchema = v.optional(
	v.object({
		hideAddButton: v.optional(v.boolean()),
	})
) satisfies PropertyTypeSchema;
