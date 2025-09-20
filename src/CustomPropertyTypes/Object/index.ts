import { text } from "~/i18next";
import { CustomPropertyType, PropertyTypeSchema } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import * as v from "valibot";

export const objectPropertyType: CustomPropertyType = {
	type: "object",
	name: () => text("customPropertyTypes.object.name"),
	icon: "lucide-braces",
	validate: (v) =>
		v === null ||
		v === undefined ||
		(typeof v === "object" && !Array.isArray(v)),
	registerListeners,
	renderSettings,
	renderWidget,
};

export const objectSettingsSchema = v.optional(
	v.object({
		hideAddButton: v.optional(v.boolean()),
		collapsed: v.optional(v.boolean()), // not frontend facing
	})
) satisfies PropertyTypeSchema;
