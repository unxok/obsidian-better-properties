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

export const typeKey = "slider" satisfies CustomTypeKey;

export const sliderPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.slider.name"),
	icon: "lucide-git-commit",
	validate: (v) => typeof v === "number",
	registerListeners,
	renderSettings,
	renderWidget,
};

export const sliderSettingsSchema = v.optional(
	v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		step: v.optional(v.number()),
		hideLimits: v.optional(v.boolean()),
	})
) satisfies PropertyTypeSchema;
