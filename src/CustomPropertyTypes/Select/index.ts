import { CustomPropertyType, CustomTypeKey } from "..";
import { renderWidget } from "./renderWidget";
import { renderSettings } from "./renderSettings";
import { registerListeners } from "./registerListeners";
import { text } from "~/i18next";
import { PropertyTypeSchema } from "../types";
import * as v from "valibot";

export const typeKey = "select" satisfies CustomTypeKey;

export const selectPropertyType: CustomPropertyType = {
	type: typeKey,
	icon: "lucide-circle-chevron-down",
	name: () => text("customPropertyTypes.select.name"),
	validate: (v) => typeof v?.toString() === "string",
	renderWidget,
	registerListeners,
	renderSettings,
};

export const selectSettingsSchema = v.optional(
	v.object({
		useDefaultStyle: v.optional(v.boolean(), false),
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
			),
			[
				{
					value: "",
					label: "none",
					bgColor: "var(--better-properties-select-gray)",
				},
				{
					value: "apples",
					label: "ApPLeS",
					bgColor: "var(--better-properties-select-red)",
				},
				{
					value: "bananas",
					bgColor: "var(--better-properties-select-yellow)",
				},
				{
					value: "watermelon",
					bgColor: "var(--better-properties-select-watermelon)",
				},
			]
		),
		dynamicOptionsType: v.optional(
			v.union([
				v.literal("filesInFolder"),
				v.literal("filesFromTag"),
				v.literal("filesFromInlineJs"),
				v.literal("filesFromJsFile"),
			])
		),
		dynamicEmptyLabel: v.optional(v.string()),
		folderOptionsPaths: v.optional(v.array(v.string())),
		folderOptionsIsSubsIncluded: v.optional(v.boolean()),
		folderOptionsExcludeFolderNote: v.optional(v.boolean()),
		tagOptionsTags: v.optional(v.array(v.string())),
		tagOptionsIncludeNested: v.optional(v.boolean()),
		inlineJsOptionsCode: v.optional(v.string()),
		fileJsOptionsPath: v.optional(v.string()),
	})
) satisfies PropertyTypeSchema;
