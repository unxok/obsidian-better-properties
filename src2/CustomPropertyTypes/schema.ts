import { PropertySettings } from "./types";
import * as v from "valibot";

export const propertySettingsSchema = v.object({
	general: v.optional(
		v.object({
			icon: v.optional(v.string()),
			hidden: v.optional(v.optional(v.boolean())),
			defaultValue: v.optional(v.string()),
			// onloadScript: z.string(),
			alias: v.optional(v.string()),
			suggestions: v.optional(v.array(v.string())),
		})
	),
	select: v.optional(
		v.object({
			useDefaultStyle: v.optional(v.boolean()),
			optionsType: v.optional(
				v.union([v.literal("manual"), v.literal("dynamic")])
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
				)
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
}) satisfies v.ObjectSchema<
	Record<
		string,
		v.OptionalSchema<
			v.ObjectSchema<
				Record<string, v.OptionalSchema<v.GenericSchema, undefined>>,
				undefined
			>,
			undefined
		>
	>,
	undefined
>;

export const getDefaultPropertySettings = (): PropertySettings => ({
	general: {
		icon: "",
		hidden: false,
	},
	select: {
		optionsType: "manual",
		manualOptions: [],
		dynamicOptionsType: "filesInFolder",
		folderOptionsPaths: [],
		folderOptionsIsSubsIncluded: false,
		folderOptionsExcludeFolderNote: false,
		tagOptionsTags: [],
		tagOptionsIncludeNested: false,
		scriptOptionsExternalFile: "",
		scriptOptionsType: "inline",
		scriptOptionsInlineCode: "",
	},
	toggle: {},
	title: {},
	color: {},
	created: { format: undefined },
	group: { collapsed: false, hideAddButton: false },
	markdown: {},
	modified: {},
});
