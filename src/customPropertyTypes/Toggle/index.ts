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

export const typeKey = "toggle" satisfies CustomTypeKey;

export const togglePropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.toggle.name"),
	icon: "lucide-toggle-left",
	validate: (v) => typeof v === "boolean",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const toggleSettingsSchema = v.optional(
	v.object({})
) satisfies PropertyTypeSchema;
