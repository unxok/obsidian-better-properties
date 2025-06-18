import BetterProperties from "~/main";
import { CustomPropertyType, CustomTypeKey } from ".";
import { dropdownPropertyType } from "./Dropdown";
import { PropertyWidget } from "obsidian";
import { customPropertyTypePrefix } from "~/lib/constants";
import { PropertyEntryData } from "obsidian-typings";

export const customPropertyTypesArr: CustomPropertyType<any>[] = [
	dropdownPropertyType,
].sort((a, b) => a.name().localeCompare(b.name()));

export const customPropertyTypesRecord: Record<
	CustomTypeKey,
	CustomPropertyType<any>
> = customPropertyTypesArr.reduce((acc, cur) => {
	acc[cur.type] = cur;
	return acc;
}, {} as Record<CustomTypeKey, CustomPropertyType<any>>);

export const registerCustomPropertyTypeWidgets = (plugin: BetterProperties) => {
	customPropertyTypesArr.forEach((customPropertyType) => {
		const render: PropertyWidget<unknown>["render"] = (el, value, ctx) => {
			return customPropertyType.renderWidget({ plugin, el, value, ctx });
		};
		const type = customPropertyTypePrefix + customPropertyType.type;
		plugin.app.metadataTypeManager.registeredTypeWidgets[type] = {
			...customPropertyType,
			type,
			render,
		};
	});
};

export const sortRegisteredTypeWidgets = (plugin: BetterProperties) => {
	const registered = plugin.app.metadataTypeManager.registeredTypeWidgets;
	const sortedKeys = Object.keys(registered).toSorted((a, b) => {
		const aName = registered[a].name();
		const bName = registered[b].name();
		return aName.localeCompare(bName);
	});
	const sortedWidgets = sortedKeys.reduce((acc, cur) => {
		acc[cur] = registered[cur];
		return acc;
	}, {} as Record<string, PropertyWidget<unknown>>);

	plugin.app.metadataTypeManager.registeredTypeWidgets = sortedWidgets;
	plugin.app.metadataTypeManager.trigger("changed");
};
