import { z, ZodObject } from "zod";
import { catchAndInfer } from "../libs/utils/zod";

export type TypeKeys = PropertySettings;

export type PropertySettingsOld = {
	general: {
		hidden: boolean;
		cssClass: string;
		customIcon: string;
		iconColor: string;
		iconHoverColor: string;
		labelColor: string;
		textColor: string;
	};
	slider: {
		min: number;
		max: number;
		step: number;
		showLabels: boolean;
	};
	numberPlus: {
		min: number;
		max: number;
		step: number;
		validate: boolean;
	};
	dropdown: {
		options: { value: string; label: string }[];

		dynamicInlineJs: string;
		dynamicFileJs: string;
	};
	button: {
		displayText: string;
		icon: string;
		callbackType: "inlineJs" | "fileJs" | "Command";
		style:
			| "default"
			| "accent"
			| "warning"
			| "destructive"
			| "muted"
			| "ghost";
		bgColor: string;
		textColor: string;
		cssClass: string;
	};
	toggle: {};
	color: {};
	markdown: {};
	email: {};
	stars: {
		customIcon: string;
		max: number;
	};
};

// can't think of a way to have this typed properly but at least this avoids hard coding the keys somewhat
// export const defaultPropertySettings: PropertySettings = {
// 	general: {
// 		hidden: false,
// 		cssClass: "",
// 		customIcon: "",
// 		iconColor: "",
// 		iconHoverColor: "",
// 		labelColor: "",
// 		textColor: "",
// 	},
// 	slider: {
// 		min: 0,
// 		max: 100,
// 		step: 1,
// 		showLabels: true,
// 	},
// 	numberPlus: {
// 		min: 0,
// 		max: 100000,
// 		step: 1,
// 		validate: true,
// 	},
// 	dropdown: {
// 		options: [
// 			{ label: "Apples", value: "apples" },
// 			{ label: "Oranges", value: "oranges" },
// 			{ label: "Bananas", value: "bananas" },
// 		],
// 		dynamicInlineJs: "",
// 		dynamicFileJs: "",
// 	},
// 	button: {
// 		displayText: "click me",
// 		callbackType: "inlineJs",
// 		icon: "",
// 		style: "default",
// 		bgColor: "",
// 		textColor: "",
// 		cssClass: "",
// 	},
// 	toggle: {},
// 	color: {},
// 	markdown: {},
// 	email: {},
// 	stars: {
// 		customIcon: "star",
// 		max: 5,
// 	},
// };

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
							label: z.string().catch(""),
						})
					)
					.catch([{ value: "apples", label: "Apples" }]),
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
	})
);

export const defaultPropertySettings = PropertySettingsSchema.parse({});

export type PropertySettings = z.infer<typeof PropertySettingsSchema>;
