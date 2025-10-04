import BetterProperties from "~/main";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { Icon } from "~/lib/types/icons";
import { deleteProperty } from "~/lib/utils";
import { openDeleteModal } from "./delete";
import { openRenameModal } from "./rename";
import { Menu, MenuItem, MenuSeparator, Notice } from "obsidian";
import { openChangeIconModal } from "./icon";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";
import { customPropertyTypePrefix } from "~/lib/constants";
import { MetadataTypeManager } from "obsidian-typings";
import { getTrueProperty } from "~/CustomPropertyTypes/utils";

export const onFilePropertyMenu = (
	plugin: BetterProperties,
	menu: Menu,
	property: string
) => {
	const { metadataTypeManager } = plugin.app;

	const trueProperty = getTrueProperty(property);

	const found = menu.items.find((item) => {
		if (item instanceof MenuSeparator) return false;
		return !!item.submenu;
	}) as MenuItem | undefined;
	found?.setSection("action");

	if (found) {
		recreateTypeOptionsSubmenu({
			found,
			metadataTypeManager,
			property,
		});
	}

	const isReserved = Object.values(
		metadataTypeManager.registeredTypeWidgets
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
					showPropertySettingsModal({ plugin, property: trueProperty });
				})
		)
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle(obsidianText("interface.menu.rename"))
				.setIcon("lucide-pen" satisfies Icon)
				.onClick(async () => {
					if (property !== trueProperty) {
						new Notice("Array sub-properties cannot be renamed.");
						return;
					}
					openRenameModal({ plugin, property });
				})
		)
		.addItem((item) =>
			item
				.setSection("action")
				.setTitle(text("common.icon"))
				.setIcon("lucide-badge-info" satisfies Icon)
				.onClick(async () => {
					openChangeIconModal({ plugin, property: trueProperty });
				})
		)
		.addItem((item) =>
			item
				.setSection("danger")
				.setWarning(true)
				.setTitle(obsidianText("interface.delete-action-short-name"))
				.setIcon("lucide-x-circle" satisfies Icon)
				.onClick(async () => {
					if (property !== trueProperty) {
						new Notice("Array sub-properties cannot be deleted.");
						return;
					}
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

const recreateTypeOptionsSubmenu = ({
	found,
	metadataTypeManager,
	property,
}: {
	found: MenuItem;
	metadataTypeManager: MetadataTypeManager;
	property: string;
}) => {
	found.submenu!.items.forEach((item) => {
		(item as MenuItem).dom.remove();
	});

	found.submenu?.unload();
	found.submenu?.dom.remove();
	found.submenu = null;
	found.dom.querySelector(".menu-item-icon.mod-submenu")?.remove();
	const submenu = found.setSubmenu();

	const OBSIDIAN = "obsidian";
	const BETTER_PROPERTIES = "better-properties";
	submenu.addSections([OBSIDIAN, BETTER_PROPERTIES]);

	Object.values(metadataTypeManager.registeredTypeWidgets).forEach((widget) => {
		if (widget.reservedKeys) return;
		submenu.addItem((item) => {
			const isBuiltin = !widget.type.startsWith(customPropertyTypePrefix);
			item.onClick(() => {
				metadataTypeManager.setType(property, widget.type);
			});
			item.setTitle(widget.name()).setIcon(widget.icon);

			if (!isBuiltin) {
				item.dom.setAttribute("data-is-better-properties", "true");
			}

			// TODO make this an optional in settings
			// item.setSection(isBuiltin ? OBSIDIAN : BETTER_PROPERTIES);

			if (metadataTypeManager.getAssignedWidget(property) === widget.type) {
				item.setChecked(true);
			}
		});
	});
};
