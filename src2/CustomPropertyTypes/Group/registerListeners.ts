import BetterProperties from "~/main";
import { CustomPropertyType } from "../types";

export const registerListeners: CustomPropertyType["registerListeners"] = (
	plugin: BetterProperties
) => {
	// ensures type changes of sub-properties cause a rerender for the highest parent property
	plugin.registerEvent(
		plugin.app.metadataTypeManager.on("changed", (property) => {
			if (!property?.includes(".")) return;
			const parentKey = property.split(".")[0]?.toLowerCase();
			if (!parentKey) return;
			plugin.app.metadataTypeManager.trigger("changed", parentKey);
		})
	);
};
