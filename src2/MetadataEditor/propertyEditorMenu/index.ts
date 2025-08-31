import BetterProperties from "~/main";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { Icon } from "~/lib/types/icons";
import { deleteProperty } from "~/lib/utils";
import { openDeleteModal } from "./delete";
import { openRenameModal } from "./rename";
import { Menu, MenuItem, MenuSeparator } from "obsidian";
import { openChangeIconModal } from "./icon";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";

export const onFilePropertyMenu = (
	plugin: BetterProperties,
	menu: Menu,
	property: string
) => {
	const found = menu.items.find((item) => {
		if (item instanceof MenuSeparator) return false;
		return !!item.submenu;
	}) as MenuItem | undefined;
	found?.setSection("action");

	const isReserved = Object.values(
		plugin.app.metadataTypeManager.registeredTypeWidgets
	).some(({ reservedKeys }) => {
		return reservedKeys?.includes(property);
	});
	if (found && isReserved) {
		found.submenu?.items?.forEach((item) => {
			if (item instanceof MenuSeparator) return;
			item.setDisabled(true);
		});
	}

	menu
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle(obsidianText("interface.settings"))
				.setIcon("lucide-settings" satisfies Icon)
				.onClick(() => {
					showPropertySettingsModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle(obsidianText("interface.menu.rename"))
				.setIcon("lucide-pen" satisfies Icon)
				.onClick(async () => {
					openRenameModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle(text("common.icon"))
				.setIcon("lucide-badge-info" satisfies Icon)
				.onClick(async () => {
					openChangeIconModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("danger")
				.setWarning(true)
				.setTitle(obsidianText("interface.delete-action-short-name"))
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
