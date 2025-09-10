import { TITLE } from "~/lib/constants";
import { CustomPropertyType, PropertyTypeSchema } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import { text } from "~/i18next";
import * as v from "valibot";

export const titlePropertyType: CustomPropertyType = {
	type: "title",
	name: () => text("customPropertyTypes.title.name"),
	icon: "lucide-letter-text",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
	reservedKeys: [TITLE],
};

export const titleSettingsSchema: PropertyTypeSchema = v.optional(v.object({}));
