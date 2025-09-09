import { NonNullishObject } from "~/lib/utils";
import { PropertySettings } from "./types";
import * as v from "valibot";

type PropertyTypeSchema = v.OptionalSchema<
	v.ObjectSchema<
		Record<string, v.OptionalSchema<v.GenericSchema, unknown>>,
		undefined
	>,
	undefined
>;

type SettingsBase = v.ObjectSchema<
	Record<string, PropertyTypeSchema>,
	undefined
>;

// TODO move each type schema to be coupled with the type's widget definition

export const propertySettingsSchema = v.object({
	general: v.optional(
		v.object({
			icon: v.optional(v.string(), ""),
			hidden: v.optional(v.boolean(), false),
			defaultValue: v.optional(v.string()),
			// onloadScript: z.string(),
			alias: v.optional(v.string()),
			suggestions: v.optional(v.array(v.string())),
		})
	),
	select: v.optional(
		v.object({
			useDefaultStyle: v.optional(v.boolean(), false),
			optionsType: v.optional(
				v.union([v.literal("manual"), v.literal("dynamic")]),
				"manual"
			),
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
					v.literal("script"),
				])
			),
			folderOptionsPaths: v.optional(v.array(v.string())),
			folderOptionsIsSubsIncluded: v.optional(v.boolean()),
			folderOptionsExcludeFolderNote: v.optional(v.boolean()),
			tagOptionsTags: v.optional(v.array(v.string())),
			tagOptionsIncludeNested: v.optional(v.boolean()),
			scriptOptionsType: v.optional(
				v.union([v.literal("inline"), v.literal("external")])
			),
			scriptOptionsInlineCode: v.optional(v.string()),
			scriptOptionsExternalFile: v.optional(v.string()),
		})
	),
	toggle: v.optional(v.object({})),
	title: v.optional(v.object({})),
	markdown: v.optional(v.object({})),
	created: v.optional(
		v.object({
			format: v.optional(v.string()),
		})
	),
	modified: v.optional(v.object({})),
	group: v.optional(
		v.object({
			hideAddButton: v.optional(v.boolean()),
			collapsed: v.optional(v.boolean()), // not frontend facing
		})
	),
	color: v.optional(v.object({})),
}) satisfies SettingsBase;

export const getDefaultPropertySettings =
	(): NonNullishObject<PropertySettings> => {
		return Object.entries(propertySettingsSchema.entries).reduce(
			(acc, [k, schema]) => {
				const key = k as keyof typeof acc;
				// @ts-ignore TODO
				acc[key] = v.parse(schema, {});
				return acc;
			},
			{} as NonNullishObject<PropertySettings>
		);
	};
