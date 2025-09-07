import { around, dedupe } from "monkey-around";
import { getPropertyTypeSettings } from "~/CustomPropertyTypes";
import { monkeyAroundKey } from "~/lib/constants";
import BetterProperties from "~/main";

export const patchMetadataCache = (plugin: BetterProperties) => {
	const removePatch = around(plugin.app.metadataCache, {
		getFrontmatterPropertyValuesForKey: (old) =>
			dedupe(monkeyAroundKey, old, function (property) {
				const { suggestions } = getPropertyTypeSettings({
					plugin,
					property,
					type: "general",
				});
				return suggestions ?? old(property);
			}),
	});

	plugin.register(removePatch);
};
