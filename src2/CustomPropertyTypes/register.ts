import BetterProperties from "~/main";
import { CustomPropertyType, CustomTypeKey, getPropertyTypeSettings } from ".";
import { selectPropertyType } from "./Select";
import { Notice, setIcon } from "obsidian";
import { customPropertyTypePrefix, monkeyAroundKey } from "~/lib/constants";
import { around, dedupe } from "monkey-around";
import { togglePropertyType } from "./Toggle";
import { titlePropertyType } from "./Title";
import { markdownPropertyType } from "./Markdown";
import {
	MetadataTypeManagerRegisteredTypeWidgetsRecord,
	PropertyWidget,
} from "obsidian-typings";
import { createdPropertyType } from "./Created";
import { groupPropertyType } from "./Group";
import { tryParseYaml } from "@/libs/utils/obsidian";
import { triggerPropertyTypeChange } from "./utils";

export const customPropertyTypesArr: CustomPropertyType[] = [
	selectPropertyType,
	togglePropertyType,
	titlePropertyType,
	markdownPropertyType,
	createdPropertyType,
	groupPropertyType,
];

export const customPropertyTypesRecord: Record<
	CustomTypeKey,
	CustomPropertyType
> = customPropertyTypesArr.reduce((acc, cur) => {
	acc[cur.type] = cur;
	return acc;
}, {} as Record<CustomTypeKey, CustomPropertyType>);

export const registerCustomPropertyTypeWidgets = (plugin: BetterProperties) => {
	customPropertyTypesArr.forEach((customPropertyType) => {
		// @ts-expect-error TODO obsidian-typings issue I think
		const render: PropertyWidget["render"] = (el, value, ctx) => {
			return customPropertyType.renderWidget({ plugin, el, value, ctx });
		};
		const type = customPropertyTypePrefix + customPropertyType.type;
		const { icon, name, validate, reservedKeys } = customPropertyType;
		plugin.app.metadataTypeManager.registeredTypeWidgets[type] = {
			type,
			render,
			icon,
			name,
			validate,
			reservedKeys,
		};

		customPropertyType.registerListeners(plugin);

		if (customPropertyType.reservedKeys?.length) {
			customPropertyType.reservedKeys.forEach((key) => {
				plugin.app.metadataTypeManager.setType(key, type);
			});
		}
	});
};

export const wrapAllPropertyTypeWidgets = (plugin: BetterProperties) => {
	const { registeredTypeWidgets } = plugin.app.metadataTypeManager;
	Object.values(registeredTypeWidgets).forEach((widget) => {
		// console.log(widget.name(), widget.render);
		const removePatch = around(widget, {
			render(old) {
				return dedupe(monkeyAroundKey, old, (containerEl, value, ctx) => {
					const toReturn = old(containerEl, value, ctx);

					const settings = getPropertyTypeSettings({
						plugin,
						property: ctx.key,
						type: "general",
					});

					if (settings.icon) {
						const iconEl = containerEl.parentElement?.querySelector(
							".metadata-property-icon"
						);
						if (iconEl instanceof HTMLElement) {
							setIcon(iconEl, settings.icon);
						}
					}

					if (settings.hidden) {
						containerEl.parentElement?.setAttribute(
							"data-better-properties-hidden",
							"true"
						);
					}

					const valueIsEmpty =
						typeof value === "object" &&
						(value === null || value === undefined || Object.isEmpty(value));
					if (settings.defaultValue !== undefined && valueIsEmpty) {
						const parsedValue = tryParseYaml(settings.defaultValue);
						if (!parsedValue.success) {
							const err =
								parsedValue.error instanceof Error
									? parsedValue.error.message
									: "Unknown error";
							new Notice(err);
							console.error(err);
						}

						if (parsedValue.success) {
							window.setTimeout(() => {
								ctx.onChange(parsedValue.data);
								triggerPropertyTypeChange(
									plugin.app.metadataTypeManager,
									ctx.key
								);
							}, 0);
						}
					}

					if (settings.alias) {
						const keyInputEl: HTMLElement | undefined | null =
							containerEl.parentElement?.querySelector(
								"input.metadata-property-key-input"
							);
						if (keyInputEl) {
							const existing = containerEl.parentElement?.querySelector(
								".better-properties-metadata-property-alias-input"
							) as HTMLInputElement | undefined | null;
							if (existing) {
								existing.style.removeProperty("display");
							}
							const aliasEl =
								existing ?? (keyInputEl.cloneNode() as HTMLInputElement);
							keyInputEl.insertAdjacentElement("afterend", aliasEl);
							keyInputEl.style.display = "none";
							keyInputEl.addEventListener("blur", () => {
								keyInputEl.style.display = "none";
								aliasEl.style.removeProperty("display");
							});
							aliasEl.value = settings.alias;
							aliasEl.classList.add(
								"better-properties-metadata-property-alias-input"
							);
							aliasEl.setAttribute("aria-disabled", "true");
							aliasEl.addEventListener("focus", () => {
								aliasEl.style.display = "none";
								keyInputEl.style.removeProperty("display");
								keyInputEl.focus();
							});
						}
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

	//TODO maybe do this in a separate function
	Object.values(plugin.disabledTypeWidgets).forEach((w) => {
		registeredTypeWidgets[w.type] = { ...w };
	});
};

export const sortAndFilterRegisteredTypeWidgets = (
	plugin: BetterProperties
) => {
	const registered = {
		...plugin.app.metadataTypeManager.registeredTypeWidgets,
		...plugin.disabledTypeWidgets,
	};
	plugin.disabledTypeWidgets = {};
	const sortedKeys = Object.keys(registered).toSorted((a, b) => {
		const aName = registered[a as keyof typeof registered].name();
		const bName = registered[b as keyof typeof registered].name();
		return aName.localeCompare(bName);
	});
	const sortedWidgets = sortedKeys.reduce((acc, cur) => {
		const key = cur as keyof typeof registered;
		if (plugin.settings.hiddenPropertyTypes?.includes(registered[key]?.type)) {
			plugin.disabledTypeWidgets[cur] = registered[key];
			return acc;
		}
		acc[cur] = registered[key];
		return acc;
	}, {} as MetadataTypeManagerRegisteredTypeWidgetsRecord);

	plugin.app.metadataTypeManager.registeredTypeWidgets = sortedWidgets;
	plugin.app.metadataTypeManager.trigger("changed");
};
