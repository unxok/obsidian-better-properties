import { z } from "zod";
import { catchAndInfer } from "../libs/utils/zod";

export const PropertySettingsSchema = catchAndInfer(
	z.object({
		general: catchAndInfer(
			z.object({
				hidden: z.boolean().catch(false),
				cssClass: z.string().catch(""),
				customIcon: z.string().catch(""),
				iconColor: z.string().catch(""),
				iconHoverColor: z.string().catch(""),
				labelColor: z.string().catch(""),
				textColor: z.string().catch(""),
				includeDefaultSuggestions: z.boolean().catch(true),
				staticSuggestions: z.array(z.string().catch("")).catch([]),
			})
		),

		slider: catchAndInfer(
			z.object({
				min: z.number().catch(0),
				max: z.number().catch(100),
				step: z.number().catch(1),
				showLabels: z.boolean().catch(true),
			})
		),

		numberPlus: catchAndInfer(
			z.object({
				min: z.number().catch(0),
				max: z.number().catch(100000),
				step: z.number().catch(1),
				validate: z.boolean().catch(true),
			})
		),

		dropdown: catchAndInfer(
			z.object({
				options: z
					.array(
						z.object({
							value: z.string().catch(""),
							config: catchAndInfer(
								z.object({
									label: z.string().catch(""),
									backgroundColor: z.string().catch(""),
									textColor: z.string().catch(""),
								})
							),
						})
					)
					.catch([]),
				dynamicInlineJs: z.string().catch(""),
				dynamicFileJs: z.string().catch(""),
			})
		),

		button: catchAndInfer(
			z.object({
				displayText: z.string().catch("click me"),
				icon: z.string().catch(""),
				callbackType: z
					.enum(["inlineJs", "fileJs", "Command"])
					.catch("inlineJs"),
				style: z
					.enum([
						"default",
						"accent",
						"warning",
						"destructive",
						"muted",
						"ghost",
					])
					.catch("default"),
				bgColor: z.string().catch(""),
				textColor: z.string().catch(""),
				cssClass: z.string().catch(""),
			})
		),

		toggle: catchAndInfer(z.object({})),

		color: catchAndInfer(z.object({})),

		markdown: catchAndInfer(z.object({})),

		email: catchAndInfer(z.object({})),

		stars: catchAndInfer(
			z.object({
				customIcon: z.string().catch("star"),
				max: z.number().catch(5),
			})
		),

		progress: catchAndInfer(z.object({})),

		time: catchAndInfer(z.object({})),
		group: catchAndInfer(
			z.object({
				headerText: z.string().catch(""),
				showIndentationLines: z.boolean().catch(true),
				showAddButton: z.boolean().catch(true),
			})
		),
		js: catchAndInfer(z.object({})),
		text: catchAndInfer(
			z.object({
				includeDefaultSuggestions: z.boolean().catch(true),
				staticSuggestions: z.array(z.string().catch("")).catch([]),
			})
		),
	})
);

export const defaultPropertySettings = PropertySettingsSchema.parse({});

export type PropertySettings = z.infer<typeof PropertySettingsSchema>;
