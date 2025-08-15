import BetterProperties from "~/main";
import { CustomTypeKey, PropertySettings } from "./types";
import { typeWidgetPrefix } from "@/libs/constants";
import { getDefaultPropertySettings } from "./schema";
import { ValueComponent } from "obsidian";

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

export class PropertyValueComponent<T> extends ValueComponent<T> {
	constructor(public containerEl: HTMLElement) {
		super();
	}

	getValue(): T {
		throw new Error("Method not implemented");
	}

	setValue(value: T): this {
		throw new Error("Method not implemented");
		value;
	}

	focus(): void {
		throw new Error("Method not implemented");
	}
}

export const withoutTypeWidgetPrefix = (str: string) => {
	if (!str.startsWith(typeWidgetPrefix)) return str;
	return str.slice(typeWidgetPrefix.length);
};
