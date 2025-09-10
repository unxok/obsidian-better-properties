import BetterProperties from "~/main";
import { View } from "obsidian";
import { patchMenu } from "./patchMenu";
import { onFilePropertyMenu } from "./propertyEditorMenu";

export { patchMetadataEditor } from "./patchMetadataEditor";

export const customizePropertyEditorMenu = (plugin: BetterProperties) => {
	patchMenu(plugin);

	plugin.registerEvent(
		plugin.app.workspace.on(
			"better-properties:file-property-menu",
			(menu, property) => {
				onFilePropertyMenu(plugin, menu, property);
			}
		)
	);
};

export const refreshPropertyEditor = (
	plugin: BetterProperties,
	property: string
) => {
	const lower = property.toLowerCase();
	const withoutDots = lower.split(".")[0];
	plugin.app.metadataTypeManager.trigger("changed", lower);
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		if (!leaf.view.hasOwnProperty("metadataEditor")) return;
		const view = leaf.view as View & {
			metadataEditor: {
				onMetadataTypeChange: (propName: string) => void;
			};
		};

		// This is to force dropdowns to re-render with updated options
		// the easiest way I found was to emulate a type change
		view.metadataEditor.onMetadataTypeChange(withoutDots);
	});
};
