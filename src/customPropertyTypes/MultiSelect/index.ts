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

export const typeKey = "multiselect" satisfies CustomTypeKey;

export const multiSelectPropertyType: CustomPropertyType = {
	type: typeKey,
	name: () => text("customPropertyTypes.multiSelect.name"),
	icon: "lucide-list-collapse",
	validate: (v) => Array.isArray(v),
	registerListeners,
	renderSettings,
	renderWidget,
};

export const multiSelectSettingsSchema = v.optional(
	v.object({
		optionsType: v.optional(
			v.union([v.literal("manual"), v.literal("dynamic")]),
			"manual"
		),
		manualAllowCreate: v.optional(v.boolean()),
		manualOptions: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.optional(v.string()),
					desc: v.optional(v.string()),
					bgColor: v.optional(v.string()),
					textColor: v.optional(v.string()),
				})
			)
		),
		dynamicOptionsType: v.optional(
			v.union([
				v.literal("filesInFolder"),
				v.literal("filesFromTag"),
				v.literal("filesFromInlineJs"),
				v.literal("filesFromJsFile"),
			])
		),
		folderOptionsPaths: v.optional(v.array(v.string())),
		folderOptionsIsSubsIncluded: v.optional(v.boolean()),
		folderOptionsExcludeFolderNote: v.optional(v.boolean()),
		tagOptionsTags: v.optional(v.array(v.string())),
		tagOptionsIncludeNested: v.optional(v.boolean()),
		inlineJsOptionsCode: v.optional(v.string()),
		fileJsOptionsPath: v.optional(v.string()),
	})
) satisfies PropertyTypeSchema;
