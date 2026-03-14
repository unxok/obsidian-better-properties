import {
	PropertyWidget,
	PropertyRenderContext,
	PropertyWidgetComponentBase,
} from "obsidian-typings";
import type { BetterProperties } from "#/Plugin";
import * as v from "valibot";
import { PropertySettings } from "./schema";

export type PropertySettingsSchema = v.ObjectSchema<
	Record<string, v.OptionalSchema<v.GenericSchema, {}>>,
	undefined
>;

export type CustomPropertyWidget = Omit<PropertyWidget, "type" | "render"> & {
	render: (
		containerEl: HTMLElement,
		data: unknown,
		context: PropertyRenderContext
	) => Omit<PropertyWidgetComponentBase, "type">;
};

export type CustomPropertyType<T extends keyof PropertySettings["types"]> = {
	getWidget: (params: {
		plugin: BetterProperties;
		/**
		 * Get this type's settings for a given property
		 */
		getSettings: (propertyName: string) => PropertySettings["types"][T];
		setSettings: (
			propertyName: string,
			settings: PropertySettings["types"][T]
		) => Promise<void>;
		updateSettings: (
			propertyName: string,
			callback: (
				settings: PropertySettings["types"][T]
			) => PropertySettings["types"][T]
		) => Promise<void>;
	}) => CustomPropertyWidget;
	renderSettings: (plugin: BetterProperties) => void;
	registerListeners: (plugin: BetterProperties) => void;
};
