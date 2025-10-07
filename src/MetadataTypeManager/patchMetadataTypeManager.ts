import { around, dedupe } from "monkey-around";
import { getTrueProperty } from "~/CustomPropertyTypes/utils";
import { monkeyAroundKey } from "~/lib/constants";
import BetterProperties from "~/main";

export const patchMetadataTypeManager = (plugin: BetterProperties): void => {
	const removePatch = around(plugin.app.metadataTypeManager, {
		getAssignedWidget(old) {
			return dedupe(monkeyAroundKey, old, function (property) {
				// @ts-expect-error
				const that: MetadataTypeManager = this;
				return old.call(that, getTrueProperty(property));
			});
		},
		setType(old) {
			return dedupe(monkeyAroundKey, old, function (property, type) {
				// @ts-expect-error
				const that: MetadataTypeManager = this;
				return old.call(that, getTrueProperty(property), type);
			});
		},
	});

	plugin.register(removePatch);
};
