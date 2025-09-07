import { z, ZodObject, ZodOptional, ZodTypeAny } from "zod";
import { PropertySettings } from "./types";

export const propertySettingsSchema = z.object({
	general: z
		.object({
			icon: z.string().optional(),
			hidden: z.boolean().optional(),
			defaultValue: z.string().optional(),
			// onloadScript: z.string().optional(),
			alias: z.string().optional(),
			suggestions: z.array(z.string()).optional(),
		})
		.optional(),
	select: z
		.object({
			optionsType: z
				.union([z.literal("manual"), z.literal("dynamic")])
				.optional(),
			manualOptions: z
				.array(
					z.object({
						value: z.string(),
						label: z.string().optional(),
						desc: z.string().optional(),
						bgColor: z.string().optional(),
						textColor: z.string().optional(),
					})
				)
				.optional(),
			dynamicOptionsType: z
				.union([
					z.literal("filesInFolder"),
					z.literal("filesFromTag"),
					z.literal("script"),
				])
				.optional(),
			folderOptionsPaths: z.array(z.string()).optional(),
			folderOptionsIsSubsIncluded: z.boolean().optional(),
			folderOptionsExcludeFolderNote: z.boolean().optional(),
			tagOptionsTags: z.array(z.string()).optional(),
			tagOptionsIncludeNested: z.boolean().optional(),
			scriptOptionsType: z
				.union([z.literal("inline"), z.literal("external")])
				.optional(),
			scriptOptionsInlineCode: z.string().optional(),
			scriptOptionsExternalFile: z.string().optional(),
		})
		.optional(),
	toggle: z.object({}).optional(),
	title: z.object({}).optional(),
	markdown: z.object({}).optional(),
	created: z
		.object({
			format: z.string().optional(),
		})
		.optional(),
	modified: z.object({}).optional(),
	group: z
		.object({
			hideAddButton: z.boolean().optional(),
			collapsed: z.boolean().optional(), // not frontend facing
		})
		.optional(),
}) satisfies ZodObject<
	Record<
		string,
		ZodOptional<ZodObject<Record<string, ZodOptional<ZodTypeAny>>>>
	>
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
});
