import { PropertyRenderContext } from "obsidian-typings";
import * as v from "valibot";
import { Prettify } from "~/lib/utils";
import { propertySettingsSchema } from "./schema";
import BetterProperties from "~/main";
import { PropertyValueComponent } from "obsidian";
import { PropertySettingsModal } from "./settings";
import { Icon } from "~/lib/types/icons";

export type PropertySettings = Prettify<
	v.InferOutput<typeof propertySettingsSchema>
>;
export type CustomTypeKey = keyof PropertySettings;

export type CustomPropertyType = {
	type: CustomTypeKey;
	icon: Icon;
	name(): string;
	validate(value: unknown): boolean;
	renderWidget(args: {
		plugin: BetterProperties;
		el: HTMLElement;
		value: unknown;
		ctx: PropertyRenderContext;
	}): PropertyValueComponent;
	reservedKeys?: string[];

	registerListeners: (plugin: BetterProperties) => void;

	renderSettings: (args: {
		plugin: BetterProperties;
		modal: PropertySettingsModal;
		property: string;
	}) => void;
};

// export type CustomTypeWidget<Value> = {
// 	type: CustomTypeKey;
// 	icon: string;
// 	default: () => Value;
// 	name: () => string;
// 	validate: (value: unknown) => boolean;
// 	render: RenderCustomTypeWidget<Value>;
// };

export type RenderCustomTypeSettings = (args: {
	plugin: BetterProperties;
	modal: PropertySettingsModal;
	type: CustomTypeKey;
	property: string;
}) => void;

export type RenderCustomTypeWidget<Value> = (args: {
	plugin: BetterProperties;
	el: HTMLElement;
	value: Value;
	ctx: PropertyRenderContext;
}) => PropertyValueComponent;

export type PropertyTypeSchema = v.OptionalSchema<
	v.ObjectSchema<
		Record<string, v.OptionalSchema<v.GenericSchema, unknown>>,
		undefined
	>,
	undefined
>;
