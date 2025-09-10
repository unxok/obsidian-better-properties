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

export const typeKey = "datecustom" satisfies CustomTypeKey;

export const dateCustomPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.datecustom.name"),
	icon: "lucide-calendar-plus",
	validate: (_v) => true, // TODO do we need to validate here?
	registerListeners,
	renderSettings,
	renderWidget,
};

export const dateCustomSettingsSchema = v.optional(
	v.object({
		type: v.optional(v.union([v.literal("date"), v.literal("datetime-local")])),
		format: v.optional(v.string()),
		placeholder: v.optional(v.string()),
		icon: v.optional(v.string()),
	})
) satisfies PropertyTypeSchema;
