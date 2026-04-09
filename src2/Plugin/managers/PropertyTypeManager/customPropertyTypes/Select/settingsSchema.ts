import { vOptionalObjectWithDefault } from "#/lib/valibot";
import { PropertyTypeSettingsSchema } from "../../types";
import * as v from "valibot";

export default vOptionalObjectWithDefault({
	test: v.optional(v.string(), "Hello world"),
	optionsType: v.optional(
		v.union([
			v.literal("manual"),
			v.literal("inline-base"),
			v.literal("base-file"),
		]),
		"manual"
	),
	manualOptions: v.optional(
		v.array(
			v.object({
				value: v.string(),
				label: v.optional(v.string()),
				background: v.optional(v.string()),
			})
		),
		[]
	),
	manualAllowCreate: v.optional(v.boolean(), true),
	inlineBase: v.optional(v.string(), ""),
	baseFile: v.optional(v.string(), ""),
	baseLabelColumn: v.optional(v.string(), ""),
	baseBackgroundColumn: v.optional(v.string(), ""),
}) satisfies PropertyTypeSettingsSchema;
