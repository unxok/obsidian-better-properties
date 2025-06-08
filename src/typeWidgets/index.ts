import BetterProperties from "@/main";
// import { ToggleWidget } from "./Toggle";
// import { widget } from "./Dropdown";
import { typeWidgetPrefix } from "@/libs/constants";
import { PropertyRenderContext, PropertyWidget } from "obsidian-typings";
// import { ButtonWidget } from "./Button";
// import { SliderWidget } from "./Slider";
// import { ColorWidget } from "./Color";
// import { MarkdownWidget } from "./Markdown";
// import { NumberPlusWidget } from "./NumberPlus";
import { Component, setIcon } from "obsidian";
import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
// import { StarsWidget } from "./Stars";
// import { ProgressWidget } from "./Progress";
// import { TimeWidget } from "./Time";
// import { createSettings, Group, widget } from "./Group";
import { Group } from "./Group";
import { Dropdown } from "./Dropdown";
import { Color } from "./Color";
import { Button } from "./Button";
import { Js } from "./Js";
import { Markdown } from "./Markdown";
import { NumberPlus } from "./NumberPlus";
import { Progress } from "./Progress";
import { Slider } from "./Slider";
import { Stars } from "./Stars";
import { Time } from "./Time";
import { Toggle } from "./Toggle";
// import { RelationWidget } from "./Relation";
// import { normalizeValue } from "@/libs/utils/dataview";

export type CustomTypeWidget<T = unknown> = {
	type: keyof PropertySettings;
	icon: string;
	default: () => T;
	name: () => string;
	validate: (v: unknown) => boolean;
	render: (
		plugin: BetterProperties,
		el: HTMLElement,
		// data: PropertyEntryData<T>,
		value: T,
		ctx: PropertyRenderContext
	) => void;
};
export type WidgetAndSettings = [
	widget: CustomTypeWidget<any>,
	createSettings: CreatePropertySettings<any>
];

export const allWidgetsAndSettings: WidgetAndSettings[] = [
	Button,
	Color,
	Dropdown,
	Group,
	Js,
	Markdown,
	NumberPlus,
	Progress,
	Slider,
	Stars,
	Time,
	Toggle,
];

export const registerCustomWidgets = (plugin: BetterProperties) => {
	allWidgetsAndSettings.forEach(([w]) => {
		const render = getWidgetRender(plugin, w.render);
		const type = typeWidgetPrefix + w.type.toString();
		plugin.app.metadataTypeManager.registeredTypeWidgets[type] = {
			...w,
			type,
			render,
		};
	});

	const registered = {
		...plugin.app.metadataTypeManager.registeredTypeWidgets,
	};
	Object.keys(registered).forEach((key) => {
		if (key.startsWith(typeWidgetPrefix)) return;
		const widget = registered[key];
		const render = getWidgetRender(plugin, (_, ...args) =>
			widget.render(...args)
		);
		registered[key] = {
			...widget,
			render,
		};
	});

	const sortedKeys = Object.entries(registered).sort(
		([_keyA, valueA], [_keyB, valueB]) =>
			valueA.name().localeCompare(valueB.name())
	);
	const sorted = sortedKeys.reduce((acc, [key, widget]) => {
		acc[key] = widget;
		return acc;
	}, {} as Record<string, PropertyWidget<unknown>>);

	plugin.app.metadataTypeManager.registeredTypeWidgets = sorted;

	plugin.app.metadataTypeManager.trigger("changed");
};

const getWidgetRender = (
	plugin: BetterProperties,
	customRender: (
		plugin: BetterProperties,
		el: HTMLElement,
		// data: PropertyEntryData<unknown>,
		value: unknown,
		ctx: PropertyRenderContext
	) => void | Component
) => {
	return (
		el: HTMLElement,
		// data: PropertyEntryData<unknown>,
		value: unknown,
		ctx: PropertyRenderContext,
		...args: unknown[]
	) => {
		// const key =
		// 	(data as PropertyEntryData<unknown> & { dotKey?: string })?.dotKey ??
		// 	data.key;

		// console.log('el: ', el)
		// console.log('value: ', value);
		// console.log('ctx: ', ctx);
		// console.log('args: ', ...args)

		// TODO get dotKey from ctx
		const key = ctx.key;
		const general =
			plugin.settings.propertySettings[key?.toLowerCase()]?.general ?? {};

		const {
			hidden,
			customIcon,
			iconColor,
			iconHoverColor,
			textColor,
			labelColor,
		} = { ...defaultPropertySettings.general, ...general };

		const exit = () => customRender(plugin, el, value, ctx);

		const parent = el.parentElement;
		if (!parent) return exit();

		const iconEl = parent.find("span.metadata-property-icon");
		if (!iconEl) return exit();
		el.setAttribute("data-better-properties-hidden", hidden.toString());
		if (customIcon) {
			setIcon(iconEl, customIcon);
		}
		if (iconColor) {
			iconEl.style.setProperty("--icon-color", iconColor);
		}
		if (iconHoverColor) {
			iconEl.style.setProperty("--icon-color-focused", iconHoverColor);
		}
		if (labelColor) {
			parent.style.setProperty("--metadata-label-text-color", labelColor);
		}
		if (textColor) {
			parent.style.setProperty("--text-normal", textColor);
		}

		return exit();
	};
};
