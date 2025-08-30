import BetterProperties from "~/main";
import { CustomTypeKey, PropertySettings } from "./types";
import { getDefaultPropertySettings } from "./schema";
import { PropertyValueComponent as IPropertyValueComponent } from "obsidian";
import { customPropertyTypePrefix } from "~/lib/constants";
import { MetadataTypeManager } from "obsidian-typings";

export const getPropertySettings = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}): PropertySettings => {
	// TODO will need to add checking for dotkey when groups are added
	const lower = property.toLowerCase();
	if (!plugin.settings.propertySettings) {
		plugin.settings.propertySettings = {};
	}
	if (!plugin.settings.propertySettings[lower]) {
		plugin.settings.propertySettings[lower] = getDefaultPropertySettings();
	}
	return plugin.settings.propertySettings[lower];
};

export const deletePropertySettings = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	const lower = property.toLowerCase();
	if (!plugin.settings.propertySettings) {
		plugin.settings.propertySettings = {};
	}
	delete plugin.settings.propertySettings[lower];
	plugin.saveSettings();
};

export const setPropertySettings = ({
	plugin,
	property,
	settings,
}: {
	plugin: BetterProperties;
	property: string;
	settings: PropertySettings;
}): void => {
	// TODO will need to add checking for dotkey when groups are added
	const lower = property.toLowerCase();
	if (!plugin.settings.propertySettings) {
		plugin.settings.propertySettings = {};
	}
	plugin.settings.propertySettings[lower] = settings;
	plugin.saveSettings();
};

export const updatePropertySettings = ({
	plugin,
	property,
	cb,
}: {
	plugin: BetterProperties;
	property: string;
	cb: (settings: PropertySettings) => PropertySettings;
}) => {
	const oldSettings = getPropertySettings({ plugin, property });
	const settings = cb(oldSettings);
	setPropertySettings({ plugin, property, settings });
};

export const getPropertyTypeSettings = <T extends CustomTypeKey>({
	type,
	...args
}: {
	plugin: BetterProperties;
	property: string;
	type: T;
}): NonNullable<PropertySettings[T]> => {
	const settings = getPropertySettings(args);
	return settings[type] ?? {};
};

export const setPropertyTypeSettings = <T extends CustomTypeKey>({
	plugin,
	property,
	type,
	typeSettings,
}: {
	plugin: BetterProperties;
	property: string;
	type: T;
	typeSettings: PropertySettings[T];
}): void => {
	const settings = getPropertySettings({ plugin, property });
	settings[type] = typeSettings;
	setPropertySettings({ plugin, property, settings });
};

export const updatePropertyTypeSettings = <T extends CustomTypeKey>({
	plugin,
	property,
	type,
	cb,
}: {
	plugin: BetterProperties;
	property: string;
	type: T;
	cb: (settings: PropertySettings[T]) => PropertySettings[T];
}): void => {
	const settings = getPropertySettings({ plugin, property });
	settings[type] = cb(settings[type]);
	setPropertySettings({ plugin, property, settings });
};

export class PropertyValueComponent implements IPropertyValueComponent {
	constructor(
		public containerEl: HTMLElement,
		public setValue: (value: unknown) => void,
		public onFocus: () => void
	) {}

	focus(): void {
		this.onFocus();
	}
}

export const withoutTypeWidgetPrefix = (str: string) => {
	if (!str.startsWith(customPropertyTypePrefix)) return str;
	return str.slice(customPropertyTypePrefix.length);
};

export const findKeyValueByDotNotation = (
	key: string,
	obj: Record<string, any>
): {
	key: string | undefined;
	value: Record<string, unknown> | undefined;
} => {
	const keys = key.toLowerCase().split(".");

	let currentValue = obj;
	let currentKey: string | undefined = undefined;
	for (const k of keys) {
		if (typeof currentValue !== "object")
			return {
				key: undefined,
				value: undefined,
			};
		const foundKey = Object.keys(currentValue ?? {}).find(
			(objKey) => objKey.toLowerCase() === k
		);

		if (!foundKey)
			return {
				key: undefined,
				value: undefined,
			};
		currentKey = foundKey;
		currentValue = currentValue[foundKey];
	}
	return {
		key: currentKey,
		value: currentValue,
	};
};

export const updateNestedObject = (
	obj: Record<string, unknown>,
	key: string,
	value: unknown
) => {
	const keys = key.split(".");
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];

		if (k === "") {
			return obj;
		}

		// ensure the current level exists and is an object
		if (!current[k] || typeof current[k] !== "object") {
			current[k] = {};
		}

		current = current[k] as Record<string, unknown>;
	}

	// update final key
	current[keys[keys.length - 1]] = value;

	return obj;
};

export const flashElement = (el: HTMLElement, timeout?: number) => {
	const isFlashingClass = "is-flashing";
	el.classList.add(isFlashingClass);
	window.setTimeout(() => {
		el.classList.remove(isFlashingClass);
	}, timeout ?? 1000);
};

export const triggerPropertyTypeChange = (
	metadataTypeManager: MetadataTypeManager,
	property: string
) => {
	const lower = property.toLowerCase();
	if (!property.includes(".")) {
		metadataTypeManager.trigger("changed", lower);
		return;
	}

	const parentKey = property.split(".")[0]?.toLowerCase();
	if (!parentKey) return;
	metadataTypeManager.trigger("changed", parentKey);
};
