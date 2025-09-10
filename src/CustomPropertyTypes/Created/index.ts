import { CREATED } from "~/lib/constants";
import { CustomPropertyType, PropertyTypeSchema } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import { moment } from "obsidian";
import { text } from "~/i18next";
import * as v from "valibot";

export const createdPropertyType: CustomPropertyType = {
	type: "created",
	name: () => text("customPropertyTypes.created.name"),
	icon: "lucide-clock-10",
	validate: (v) => moment(v?.toString()).isValid(),
	registerListeners,
	renderSettings,
	renderWidget,
	reservedKeys: [CREATED],
};

export const createdSettingsSchema = v.optional(
	v.object({
		format: v.optional(v.string()),
	})
) satisfies PropertyTypeSchema;
