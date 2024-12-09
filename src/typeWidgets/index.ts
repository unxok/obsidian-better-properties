import BetterProperties from "@/main";
import { ToggleWidget } from "./Toggle";
import { DropdownWidget } from "./Dropdown";
import { typeWidgetPrefix } from "@/libs/constants";
import {
	PropertyEntryData,
	PropertyRenderContext,
	PropertyWidget,
} from "obsidian-typings";
import { ButtonWidget } from "./Button";
import { SliderWidget } from "./Slider";
import { ColorWidget } from "./Color";
import { MarkdownWidget } from "./Markdown";
import { NumberPlusWidget } from "./NumberPlus";
import { Component, setIcon } from "obsidian";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { StarsWidget } from "./Stars";
import { ProgressWidget } from "./Progress";
import { TimeWidget } from "./Time";
import { GroupWidget } from "./Group";
import { tryParseYaml } from "@/libs/utils/obsidian";
import { RelationWidget } from "./Relation";
import { normalizeValue } from "@/libs/utils/dataview";

export type CustomTypeWidget<T = unknown> = {
	type: keyof PropertySettings;
	icon: string;
	default: () => T;
	name: () => string;
	validate: (v: unknown) => boolean;
	render: (
		plugin: BetterProperties,
		el: HTMLElement,
		data: PropertyEntryData<T>,
		ctx: PropertyRenderContext
	) => void;
};

const widgets: CustomTypeWidget<any>[] = [
	ToggleWidget,
	DropdownWidget,
	ButtonWidget,
	SliderWidget,
	ColorWidget,
	MarkdownWidget,
	NumberPlusWidget,
	StarsWidget,
	ProgressWidget,
	TimeWidget,
	GroupWidget,
	RelationWidget,
];

export const registerCustomWidgets = (plugin: BetterProperties) => {
	widgets.forEach((w) => {
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
		data: PropertyEntryData<unknown>,
		ctx: PropertyRenderContext
	) => void | Component
) => {
	return (
		el: HTMLElement,
		data: PropertyEntryData<unknown>,
		ctx: PropertyRenderContext
	) => {
		// data.value = normalizeValue(data.value);

		// console.log("widget rendered: ", data.key);
		const key =
			(data as PropertyEntryData<unknown> & { dotKey?: string })?.dotKey ??
			data.key;
		const general =
			plugin.settings.propertySettings[key.toLowerCase()]?.general ?? {};

		const {
			hidden,
			customIcon,
			iconColor,
			iconHoverColor,
			textColor,
			labelColor,
		} = { ...defaultPropertySettings.general, ...general };

		const exit = () => customRender(plugin, el, data, ctx);

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
