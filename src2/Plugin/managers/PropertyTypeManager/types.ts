import {
	PropertyWidget,
	PropertyRenderContext,
	PropertyWidgetComponentBase,
} from "obsidian-typings";
import type { BetterProperties } from "#/Plugin";
import { vOptionalObjectWithDefault } from "#/lib/valibot";
import { Modal } from "obsidian";

export type PropertyTypeSettingsSchema = ReturnType<
	typeof vOptionalObjectWithDefault
>;

export type CustomPropertyWidget = Omit<PropertyWidget, "type" | "render"> & {
	render: (
		containerEl: HTMLElement,
		data: unknown,
		context: PropertyRenderContext
	) => Omit<PropertyWidgetComponentBase, "type">;
};

export type CustomPropertyType = {
	icon: string;
	name: () => string;
	validate: (value: unknown) => boolean;
	docsLink: string;
	renderSettings: (props: {
		plugin: BetterProperties;
		containerEl: HTMLElement;
		propertyName: string;
		modal: Modal;
	}) => void;
	renderWidget: (props: {
		plugin: BetterProperties;
		containerEl: HTMLElement;
		data: unknown;
		context: PropertyRenderContext;
	}) => Omit<PropertyWidgetComponentBase, "type">;
	reservedKeys?: string[] | undefined;
};
