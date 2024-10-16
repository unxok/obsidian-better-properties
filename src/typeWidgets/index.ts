import BetterProperties from "@/main";
import { ToggleWidget } from "./Toggle";
import { DropdownWidget } from "./Dropdown";
import { typeWidgetPrefix } from "@/libs/constants";
import { PropertyEntryData, PropertyRenderContext } from "obsidian-typings";
import { ButtonWidget } from "./Button";
import { SliderWidget } from "./Slider";
import { ColorWidget } from "./Color";
import { MarkdownWidget } from "./Markdown";
import { NumberPlusWidget } from "./NumberPlus";
import { Component, setIcon } from "obsidian";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { StarsWidget } from "./Stars";

export type CustomTypeWidget = {
	type: keyof PropertySettings;
	icon: string;
	default: () => unknown;
	name: () => string;
	validate: (v: unknown) => boolean;
	render: (
		plugin: BetterProperties,
		el: HTMLElement,
		data: PropertyEntryData<unknown>,
		ctx: PropertyRenderContext
	) => void;
};

const widgets: CustomTypeWidget[] = [
	ToggleWidget,
	DropdownWidget,
	ButtonWidget,
	SliderWidget,
	ColorWidget,
	MarkdownWidget,
	NumberPlusWidget,
	StarsWidget,
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

	const registered = plugin.app.metadataTypeManager.registeredTypeWidgets;
	Object.keys(registered).forEach((key) => {
		if (key.startsWith(typeWidgetPrefix)) return;
		const widget = registered[key];
		const render = getWidgetRender(plugin, (_, ...args) =>
			widget.render(...args)
		);
		plugin.app.metadataTypeManager.registeredTypeWidgets[key] = {
			...widget,
			render,
		};
	});

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
		const general =
			plugin.settings.propertySettings[data.key.toLowerCase()]?.general ??
			{};

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

		exit();
	};
};
