import { NonNullishObject } from "~/lib/utils";
import { PropertySettings, PropertyTypeSchema } from "./types";
import * as v from "valibot";
import { selectSettingsSchema } from "./Select";
import { toggleSettingsSchema } from "./Toggle";
import { titleSettingsSchema } from "./Title";
import { markdownSettingsSchema } from "./Markdown";
import { createdSettingsSchema } from "./Created";
import { groupSettingsSchema } from "./Group";
import { colorSettingsSchema } from "./Color";
import { ratingSettingsSchema } from "./Rating";
import { dateCustomSettingsSchema } from "./DateCustom";
import { sliderSettingsSchema } from "./Slider";
import { timeSettingsSchema } from "./Time";
import { multiSelectSettingsSchema } from "./MultiSelect";

type SettingsBase = v.ObjectSchema<
	Record<string, PropertyTypeSchema>,
	undefined
>;

// NOTE type key names must be all lowercase, otherwise they will fail to register
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
	select: selectSettingsSchema,
	multiselect: multiSelectSettingsSchema,
	toggle: toggleSettingsSchema,
	title: titleSettingsSchema,
	markdown: markdownSettingsSchema,
	created: createdSettingsSchema,
	// modified: v.optional(v.object({})),
	group: groupSettingsSchema,
	color: colorSettingsSchema,
	rating: ratingSettingsSchema,
	datecustom: dateCustomSettingsSchema,
	slider: sliderSettingsSchema,
	time: timeSettingsSchema,
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
