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

export const typeKey = "numeric" satisfies CustomTypeKey;

export const numericPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.numeric.name"),
	icon: "lucide-circle-percent",
	validate: (v) => typeof v === "number" || typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const numericSettingsSchema = v.optional(
	v.object({
		decimalPlaces: v.optional(v.number()),
	})
) satisfies PropertyTypeSchema;
