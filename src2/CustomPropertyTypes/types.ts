import { PropertyRenderContext } from "obsidian-typings";
import { z } from "zod";
import { Prettify } from "~/lib/utils";
import { propertySettingsSchema } from "./schema";
import BetterProperties from "~/main";
import { PropertyValueComponent } from "obsidian";
import { PropertySettingsModal } from "./settings";
import { Icon } from "~/lib/types/icons";

export type PropertySettings = Prettify<z.infer<typeof propertySettingsSchema>>;
export type CustomTypeKey = keyof PropertySettings;

// export type CustomPropertyType<Value> = {
// 	renderSettings: RenderCustomTypeSettings;
// 	widget: CustomTypeWidget<Value>;
// };

export type CustomPropertyType<Value> = {
	type: CustomTypeKey;
	icon: Icon;
	default(): Value;
	name(): string;
	validate(value: unknown): boolean;
	renderWidget(args: {
		plugin: BetterProperties;
		el: HTMLElement;
		value: Value | null;
		ctx: PropertyRenderContext;
	}): PropertyValueComponent;

	renderSettings(args: {
		plugin: BetterProperties;
		modal: PropertySettingsModal;
		property: string;
	}): void;
};

export type CustomTypeWidget<Value> = {
	type: CustomTypeKey;
	icon: string;
	default: () => Value;
	name: () => string;
	validate: (value: unknown) => boolean;
	render: RenderCustomTypeWidget<Value>;
};

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
