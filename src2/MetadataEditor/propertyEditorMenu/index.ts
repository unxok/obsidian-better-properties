import BetterProperties from "~/main";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { Icon } from "~/lib/types/icons";
import { deleteProperty } from "~/lib/utils";
import { openDeleteModal } from "./delete";
import { openRenameModal } from "./rename";
import { Menu } from "obsidian";
import { openChangeIconModal } from "./icon";

export const onFilePropertyMenu = (
	plugin: BetterProperties,
	menu: Menu,
	property: string
) => {
	const found = menu.items.find((item) => {
		return !!item.submenu;
	});
	found?.setSection("action");

	const isReserved = Object.values(
		plugin.app.metadataTypeManager.registeredTypeWidgets
	).some(({ reservedKeys }) => {
		return reservedKeys?.includes(property);
	});
	if (found && isReserved) {
		found.submenu?.items?.forEach((item) => {
			item.setDisabled(true);
		});
	}

	menu
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle("Settings")
				.setIcon("lucide-settings" satisfies Icon)
				.onClick(() => {
					showPropertySettingsModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle("Rename")
				.setIcon("lucide-pen" satisfies Icon)
				.onClick(async () => {
					openRenameModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle("Icon")
				.setIcon("lucide-badge-info" satisfies Icon)
				.onClick(async () => {
					openChangeIconModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("danger")
				.setWarning(true)
				.setTitle("Delete")
				.setIcon("lucide-x-circle" satisfies Icon)
				.onClick(async () => {
					if (plugin.settings.confirmPropertyDelete ?? true) {
						openDeleteModal({ plugin, property });
						return;
					}
					await deleteProperty({
						plugin,
						property,
					});
				})
		);

	menu.sort();
};
