import { around, dedupe } from "monkey-around";
import { MetadataCache } from "obsidian";
import { getPropertyTypeSettings } from "~/CustomPropertyTypes";
import { monkeyAroundKey } from "~/lib/constants";
import BetterProperties from "~/main";

export const patchMetadataCache = (plugin: BetterProperties) => {
	const removePatch = around(plugin.app.metadataCache, {
		getFrontmatterPropertyValuesForKey: (old) =>
			dedupe(monkeyAroundKey, old, function (property) {
				// @ts-expect-error
				const that = this as MetadataCache;
				const { suggestions } = getPropertyTypeSettings({
					plugin,
					property,
					type: "general",
				});
				return suggestions ?? old.call(that, property);
			}),
	});

	plugin.register(removePatch);
};
