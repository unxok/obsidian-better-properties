import BetterProperties from "@/main";
import { ToggleWidget } from "./Toggle";
import { DropdownWidget } from "./Dropdown";
import { typeWidgetPrefix } from "@/libs/constants";
import { TypeKeys } from "@/libs/utils/augmentMedataMenu/addSettings";
import { PropertyEntryData, PropertyRenderContext } from "obsidian-typings";
import { ButtonWidget } from "./Button";
import { SliderWidget } from "./Slider";
import { ColorWidget } from "./Color";
import { MarkdownWidget } from "./Markdown";
import { NumberPlusPlusWidget } from "./NumberPlusPlus";

export type CustomTypeWidget = {
	type: keyof TypeKeys;
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

type DefaultRender = (
	el: HTMLElement,
	data: PropertyEntryData<unknown>,
	ctx: PropertyRenderContext
) => void;

const widgets: CustomTypeWidget[] = [
	ToggleWidget,
	DropdownWidget,
	ButtonWidget,
	SliderWidget,
	ColorWidget,
	MarkdownWidget,
	NumberPlusPlusWidget,
];

export const registerCustomWidgets = (plugin: BetterProperties) => {
	widgets.forEach((w) => {
		const render: DefaultRender = (...args) => w.render(plugin, ...args);
		const type = typeWidgetPrefix + w.type;
		plugin.app.metadataTypeManager.registeredTypeWidgets[type] = {
			...w,
			type,
			render,
		};
	});

	plugin.app.metadataTypeManager.trigger("changed");
};
