import { around, dedupe } from "monkey-around";
import { getTrueProperty } from "~/customPropertyTypes/utils";
import { monkeyAroundKey } from "~/lib/constants";
import BetterProperties from "~/main";

export const patchMetadataTypeManager = (plugin: BetterProperties): void => {
	const removePatch = around(plugin.app.metadataTypeManager, {
		getAssignedWidget(old) {
			return dedupe(monkeyAroundKey, old, function (property) {
				// @ts-expect-error
				const that: MetadataTypeManager = this;
				return old.call(
					that,
					getTrueProperty(property, plugin.app.metadataTypeManager)
				);
			});
		},
		// TODO 2025-11-14 I am pretty sure this isn't needed, but I'm going to leave it commented out for now
		// setType(old) {
		// 	return dedupe(monkeyAroundKey, old, function (property, type) {
		// 		// @ts-expect-error
		// 		const that: MetadataTypeManager = this;
		// 		return old.call(that, getTrueProperty(property), type);
		// 	});
		// },
	});
	plugin.register(removePatch);
};
