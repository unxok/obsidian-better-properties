import BetterProperties from "~/main";
import { CustomTypeKey, PropertySettings } from "./types";
import { getDefaultPropertySettings } from "./schema";
// import { PropertyValueComponent as IPropertyValueComponent } from "obsidian";
import {
	PropertyRenderContext,
	PropertyWidgetComponentBase,
} from "obsidian-typings";
import { customPropertyTypePrefix } from "~/lib/constants";
import { MetadataTypeManager } from "obsidian-typings";
import { NonNullishObject } from "~/lib/utils";

export const getPropertySettings = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}): NonNullishObject<PropertySettings> => {
	const lower = property.toLowerCase();
	if (!plugin.settings.propertySettings) {
		plugin.settings.propertySettings = {};
	}
	if (!plugin.settings.propertySettings[lower]) {
		plugin.settings.propertySettings[lower] = getDefaultPropertySettings();
	}

	const typeSettings = plugin.settings.propertySettings[lower];
	const defaultTypeSettings = getDefaultPropertySettings();
	const noUndefinedTypeSettings = Object.keys(defaultTypeSettings).reduce(
		(acc, k) => {
			const key = k as keyof PropertySettings;
			const value = typeSettings[key];
			if (!value) return acc;
			// @ts-ignore TODO
			acc[key] = value;
			return acc;
		},
		defaultTypeSettings
	);
	plugin.settings.propertySettings[lower] = noUndefinedTypeSettings;
	return noUndefinedTypeSettings;
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
	const typeSettings = settings[type];
	return typeSettings;
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
	const settings: PropertySettings = getPropertySettings({ plugin, property });
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
	const settings: PropertySettings = getPropertySettings({ plugin, property });
	settings[type] = cb(settings[type]);
	setPropertySettings({ plugin, property, settings });
};

export class PropertyWidgetComponent implements PropertyWidgetComponentBase {
	constructor(
		public type: CustomTypeKey | (string & {}),
		public containerEl: HTMLElement,
		public setValue: (value: unknown) => void,
		public onFocus: () => void
	) {}

	focus(): void {
		this.onFocus();
	}
}

export abstract class PropertyWidgetComponentNew<
	Type extends CustomTypeKey,
	Value
> implements PropertyWidgetComponent
{
	containerEl: HTMLElement;
	onFocus: () => void = () => {
		throw new Error("Method not implemented");
	};

	abstract type: Type;
	abstract parseValue: (value: NonNullable<unknown>) => Value;
	abstract getValue(): Value;

	constructor(
		public plugin: BetterProperties,
		public el: HTMLElement,
		public value: unknown,
		public ctx: PropertyRenderContext
	) {
		this.containerEl = el;
	}

	focus(): void {
		this.onFocus();
	}

	setValue(value: unknown): void {
		this.ctx.onChange(value);
	}

	getSettings(): ReturnType<typeof getPropertyTypeSettings<Type>> {
		return getPropertyTypeSettings({
			plugin: this.plugin,
			property: this.ctx.key,
			type: this.type,
		});
	}

	setSettings(settings: PropertySettings[Type]): void {
		setPropertyTypeSettings({
			plugin: this.plugin,
			property: this.ctx.key,
			type: this.type,
			typeSettings: settings,
		});
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
): Record<string, unknown> => {
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
	metadataTypeManager.trigger("changed", property.toLowerCase());
	// TODO this function isn't really needed since I now handle nested keys (ex: parent.child) in Group/registerListeners.ts
};
