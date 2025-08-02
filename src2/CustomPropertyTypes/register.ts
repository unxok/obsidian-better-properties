import BetterProperties from "~/main";
import { CustomPropertyType, CustomTypeKey, getPropertyTypeSettings } from ".";
import { dropdownPropertyType } from "./Dropdown";
import { PropertyWidget, setIcon } from "obsidian";
import { customPropertyTypePrefix, monkeyAroundKey } from "~/lib/constants";
import { around, dedupe } from "monkey-around";

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

		customPropertyType.registerListeners(plugin);
	});
};

export const wrapAllPropertyTypeWidgets = (plugin: BetterProperties) => {
	const { registeredTypeWidgets } = plugin.app.metadataTypeManager;
	Object.values(registeredTypeWidgets).forEach((widget) => {
		const removePatch = around(widget, {
			render(old) {
				return dedupe(monkeyAroundKey, old, (containerEl, value, ctx) => {
					const toReturn = old(containerEl, value, ctx);

					const { icon, hidden } = getPropertyTypeSettings({
						plugin,
						property: ctx.key,
						type: "general",
					});

					if (icon) {
						const iconEl = containerEl.parentElement?.querySelector(
							".metadata-property-icon"
						);
						if (iconEl instanceof HTMLElement) {
							setIcon(iconEl, icon);
						}
					}

					if (hidden) {
						containerEl.parentElement?.setAttribute(
							"data-better-properties-hidden",
							"true"
						);
					}

					return toReturn;
				});
			},
		});

		plugin.register(removePatch);
	});
};

export const unregisterCustomPropertyTypeWidgets = (
	plugin: BetterProperties
) => {
	const { registeredTypeWidgets } = plugin.app.metadataTypeManager;
	Object.keys(registeredTypeWidgets).forEach((key) => {
		if (!key.startsWith(customPropertyTypePrefix)) return;
		delete registeredTypeWidgets[key];
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
