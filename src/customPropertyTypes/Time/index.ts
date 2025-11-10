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

export const typeKey = "time" satisfies CustomTypeKey;

export const timePropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.time.name"),
	icon: "lucide-clock",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const timeSettingsSchema = v.optional(
	v.object({})
) satisfies PropertyTypeSchema;
