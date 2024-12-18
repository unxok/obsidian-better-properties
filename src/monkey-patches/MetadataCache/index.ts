import { monkeyAroundKey } from "@/libs/constants";
import { compareFunc } from "@/libs/utils/obsidian";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import { MetadataCache } from "obsidian";

export const patchMetdataCache = (plugin: BetterProperties) => {
	const MetadataCachePrototype = Object.getPrototypeOf(
		plugin.app.metadataCache
	);

	const removePatch = patchGetFrontmatterPropertyValuesForKey(
		MetadataCachePrototype,
		plugin
	);

	plugin.register(removePatch);
};

const patchGetFrontmatterPropertyValuesForKey = (
	MetadataCachePrototype: MetadataCache,
	plugin: BetterProperties
) => {
	return around(MetadataCachePrototype, {
		getFrontmatterPropertyValuesForKey(old) {
			return dedupe(monkeyAroundKey, old, function (key: string) {
				// @ts-ignore
				const that = this as PatchedMetadataEditor;

				const {
					general: { includeDefaultSuggestions, staticSuggestions },
				} = plugin.getPropertySetting(key);

				const suggestions = new Set<string>();
				const defaultSuggestions = old.call(that, key);

				if (includeDefaultSuggestions) {
					defaultSuggestions.forEach((s) => suggestions.add(s));
				}

				staticSuggestions.forEach((s) => suggestions.add(s));

				return Array.from(suggestions).sort(compareFunc);
			});
		},
	});
};
