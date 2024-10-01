import { ColorComponent, ToggleComponent } from "obsidian";
import {
	PropertyEntryData,
	PropertyRenderContext,
	PropertyWidget,
} from "obsidian-typings";
import { typeKeySuffixes, typeWidgetPrefix } from "@/libs/constants";
import PropertiesPlusPlus from "@/main";

const shortTypeKey = typeKeySuffixes.color;
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = () => "Color";
const icon = "paintbrush";
const defaultValue = () => "#000000";
const validate = (v: unknown) => typeof v === "string";
const render = (
	el: HTMLElement,
	data: PropertyEntryData<unknown>,
	ctx: PropertyRenderContext
) => {
	const container = el
		.createDiv({
			cls: "metadata-input-longtext",
		})
		.createDiv({
			cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
		});
	const { value } = data;
	new ColorComponent(container)
		.setValue(value?.toString() ?? "")
		.onChange((b) => {
			ctx.onChange(b);
		});
};

const widget: PropertyWidget<unknown> = {
	default: defaultValue,
	type: fullTypeKey,
	name,
	icon,
	validate,
	render,
};

export const registerColor = (plugin: PropertiesPlusPlus) => {
	plugin.app.metadataTypeManager.registeredTypeWidgets[fullTypeKey] = widget;
};
