import { debounce, EventRef } from "obsidian";
import BetterProperties from "~/main";
import { refreshPropertyEditor } from "~/MetadataEditor";
import { CustomPropertyType } from "../types";
import { typeKey } from ".";

export const registerListeners: CustomPropertyType["registerListeners"] = (
	plugin: BetterProperties
) => {
	const vaultEventHandler = vaultEventHandlerFactory(plugin);
	const metadataCacheHandler = metadataCacheEventHandlerFactory(plugin);
	const eventRefs: EventRef[] = [
		plugin.app.vault.on("create", vaultEventHandler),
		plugin.app.vault.on("delete", vaultEventHandler),
		plugin.app.vault.on("rename", vaultEventHandler),
		plugin.app.metadataCache.on("changed", metadataCacheHandler),
	];
	eventRefs.forEach((ref) => plugin.registerEvent(ref));
};

const vaultEventHandlerFactory = (plugin: BetterProperties): (() => void) => {
	return debounce(
		() => {
			const { propertySettings } = plugin.settings;
			if (!propertySettings) return;

			Object.entries(propertySettings).forEach(([property, settings]) => {
				const { optionsType, dynamicOptionsType } = settings[typeKey] ?? {};
				if (optionsType !== "dynamic") return;
				if (dynamicOptionsType !== "filesInFolder") return;
				refreshPropertyEditor(plugin, property);
			});
		},
		250,
		true
	);
};

const metadataCacheEventHandlerFactory = (
	plugin: BetterProperties
): (() => void) => {
	return debounce(
		() => {
			const { propertySettings } = plugin.settings;
			if (!propertySettings) return;

			Object.entries(propertySettings).forEach(([property, settings]) => {
				const { optionsType, dynamicOptionsType } = settings[typeKey] ?? {};
				if (optionsType !== "dynamic") return;
				if (dynamicOptionsType !== "filesFromTag") return;
				refreshPropertyEditor(plugin, property);
			});
		},
		250,
		true
	);
};
