import { showChangelogView } from "~/changelog";
import { BetterProperties } from "./plugin";
import { PropertySuggestModal } from "~/classes/InputSuggest/PropertySuggest";
import { showPropertySettingsModal } from "~/customPropertyTypes/settings";
import { openRenameModal } from "~/MetadataEditor/propertyEditorMenu/rename";

export const registerCommands = (plugin: BetterProperties) => {
	plugin.addCommand({
		id: "refresh-property-editors",
		name: "Refresh Property Editors",
		callback: () => {
			plugin.refreshPropertyEditors();
		},
	});
	plugin.addCommand({
		id: "rebuild-views",
		name: "Rebuild views",
		callback: () => {
			plugin.rebuildLeaves();
		},
	});
	plugin.addCommand({
		id: "open-property-settings",
		name: "Open property settings",
		callback: () => {
			const modal = new PropertySuggestModal(plugin);
			modal.onChooseItem = (item) => {
				modal.close();
				showPropertySettingsModal({
					plugin: plugin,
					property: item.name,
				});
			};
			modal.open();
		},
	});
	plugin.addCommand({
		id: "rename-property",
		name: "Rename property",
		callback: () => {
			const modal = new PropertySuggestModal(plugin);
			modal.onChooseItem = (item) => {
				modal.close();
				openRenameModal({
					plugin: plugin,
					property: item.name,
				});
			};
			modal.open();
		},
	});
	plugin.addCommand({
		id: "view-latest-changelog",
		name: "View latest changelog",
		callback: async () => {
			await showChangelogView(plugin);
		},
	});
};
