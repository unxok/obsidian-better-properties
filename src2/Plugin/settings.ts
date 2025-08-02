import { Prettify } from "~/lib/utils";
import { z } from "zod";
import { propertySettingsSchema } from "~/CustomPropertyTypes";

const betterPropertiesSettingsSchema = z.object({
	propertySettings: z.record(propertySettingsSchema).optional(),
	confirmPropertySettingsReset: z.boolean().optional(),
	confirmPropertyDelete: z.boolean().optional(),
	propertyLabelWidth: z.number().optional(),
});

type BetterPropertiesSettings = Prettify<
	z.infer<typeof betterPropertiesSettingsSchema>
>;

const getDefaultSettings = (): BetterPropertiesSettings => ({
	propertySettings: {},
	confirmPropertySettingsReset: true,
	confirmPropertyDelete: true,
	propertyLabelWidth: undefined,
});

export {
	type BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	getDefaultSettings,
};
