import { text } from "~/i18next";
import { CustomPropertyType, PropertyTypeSchema } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import * as v from "valibot";

export const togglePropertyType: CustomPropertyType = {
	type: "toggle",
	name: () => text("customPropertyTypes.toggle.name"),
	icon: "lucide-toggle-left",
	validate: (v) => typeof v === "boolean",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const toggleSettingsSchema: PropertyTypeSchema = v.optional(
	v.object({})
);
