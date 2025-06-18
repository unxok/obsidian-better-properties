import { z } from "zod";

export const propertySettingsSchema = z.object({
	general: z.object({
		icon: z.string(),
	}),
	dropdown: z.object({
		optionsType: z
			.union([z.literal("manual"), z.literal("dynamic")])
			.optional(),
		manualOptions: z.array(
			z
				.object({
					value: z.string(),
					label: z.string(),
					// bgColor: z.string(),
					// textColor: z.string(),
				})
				.optional()
		),
		dynamicOptionsType: z
			.union([
				z.literal("filesInFolder"),
				z.literal("filesFromTag"),
				z.literal("script"),
			])
			.optional(),
		folderOptionsPath: z.string().optional(),
		folderOptionsIsSubsIncluded: z.boolean().optional(),
		folderOptionsExcludeFolderNote: z.boolean().optional(),
		tagOptionsTags: z.array(z.string()).optional(),
		scriptOptionsType: z
			.union([z.literal("inline"), z.literal("external")])
			.optional(),
		scriptOptionsInlineCode: z.string().optional(),
		scriptOptionsExternalFile: z.string().optional(),
	}),
});
