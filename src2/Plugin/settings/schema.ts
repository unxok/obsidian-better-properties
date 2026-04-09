import * as v from "valibot";
import { propertySettingsSchema } from "#/Plugin/managers/PropertyTypeManager/schema";
import {
	VOptionalObjectWithDefault,
	vOptionalObjectWithDefault,
} from "#/lib/valibot";

/**
 * The plugin settings schema
 *
 * @warning Be very careful when changing this as it may invalidate users' existing settings data
 */
export const betterPropertiesSettingsSchema = vOptionalObjectWithDefault({
	propertyLinkSyntax: v.optional(v.string(), "@"),
	propertySettings: v.optional(
		v.record(v.string(), propertySettingsSchema),
		{}
	),
	appearanceSettings: vOptionalObjectWithDefault({
		colors: v.optional(
			v.array(v.object({ name: v.string(), background: v.string() })),
			[
				{
					name: "red",
					background: "var(--better-properties--select-color-red)",
				},
				{
					name: "orange",
					background: "var(--better-properties--select-color-orange)",
				},
				{
					name: "yellow",
					background: "var(--better-properties--select-color-yellow)",
				},
				{
					name: "green",
					background: "var(--better-properties--select-color-green)",
				},
				{
					name: "blue",
					background: "var(--better-properties--select-color-blue)",
				},
				{
					name: "purple",
					background: "var(--better-properties--select-color-purple)",
				},
				{
					name: "cyan",
					background: "var(--better-properties--select-color-cyan)",
				},
				{
					name: "pink",
					background: "var(--better-properties--select-color-pink)",
				},
				{
					name: "gray",
					background: "var(--better-properties--select-color-gray)",
				},
				{
					name: "rainbow",
					background:
						"linear-gradient(to right, var(--better-properties--select-color-red) 0%, var(--better-properties--select-color-orange) 20%, var(--better-properties--select-color-yellow) 40%, var(--better-properties--select-color-green) 60%, var(--better-properties--select-color-blue) 80%, var(--better-properties--select-color-purple) 100%)",
				},
			]
		),
		showSelectX: v.optional(v.boolean(), false),
	}),
	globalFormulas: v.optional(
		v.record(
			v.string(),
			v.object({
				description: v.string(),
				formula: v.string(),
			})
		),
		{}
	),
}) satisfies VOptionalObjectWithDefault;

/**
 * The plugin settings
 */
export type BetterPropertiesSettings = v.InferOutput<
	typeof betterPropertiesSettingsSchema
>;
