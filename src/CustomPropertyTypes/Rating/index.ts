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

export const typeKey = "rating" satisfies CustomTypeKey;

export const ratingPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.rating.name"),
	icon: "lucide-star",
	validate: (v) => typeof v === "number",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const ratingSettingsSchema = v.optional(
	v.object({
		icon: v.optional(v.string()),
		count: v.optional(v.number()),
	})
) satisfies PropertyTypeSchema;
