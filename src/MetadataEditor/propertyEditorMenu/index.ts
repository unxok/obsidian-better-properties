import BetterProperties from "~/main";
import { showPropertySettingsModal } from "~/customPropertyTypes/settings";
import { Icon } from "~/lib/types/icons";
import { deleteProperty } from "~/lib/utils";
import { openDeleteModal } from "./delete";
import { openRenameModal } from "./rename";
import { Menu, MenuItem } from "obsidian";
import { openChangeIconModal } from "./icon";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";
import {
	customPropertyTypePrefix,
	reservedBuiltinPropertyNames,
} from "~/lib/constants";
import { MetadataTypeManager } from "obsidian-typings";
import { getTrueProperty } from "~/customPropertyTypes/utils";

export const onFilePropertyMenu = async (
	plugin: BetterProperties,
	menu: Menu,
	property: string,
	show: () => void
) => {
	const { metadataTypeManager } = plugin.app;

	const trueProperty = getTrueProperty(
		property,
		plugin.app.metadataTypeManager
	);
	const isArraySubProperty = trueProperty !== property;

	menu.addItem((item) =>
		item
			.setSection("action")
			.setTitle(obsidianText("interface.settings"))
			.setIcon("lucide-settings" satisfies Icon)
			.onClick(() => {
				showPropertySettingsModal({ plugin, property: trueProperty });
			})
	);

	if (!isArraySubProperty) {
		menu.addItem((item) =>
			item
				.setSection("action")
				.setTitle(obsidianText("interface.menu.rename"))
				.setIcon("lucide-pen" satisfies Icon)
				.onClick(() => {
					openRenameModal({ plugin, property });
				})
		);
	}

	menu.addItem((item) =>
		item
			.setSection("action")
			.setTitle(text("common.icon"))
			.setIcon("lucide-badge-info" satisfies Icon)
			.onClick(() => {
				openChangeIconModal({ plugin, property: trueProperty });
			})
	);

	if (!isArraySubProperty) {
		menu.addItem((item) =>
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
	}

	// sorts sections alphabetically
	menu.sort();
	// empty strings are sorted to beginning, so we manually move it back to the front so the Property Type item is back at the beginning
	menu.sections = ["", ...menu.sections.filter((id) => id !== "")];
	show();

	const propertyTypeItem = menu.items.find(
		(item) => item instanceof MenuItem && !item.section
	);
	if (!(propertyTypeItem instanceof MenuItem)) return;

	recreateTypeOptionsSubmenu({
		found: propertyTypeItem,
		metadataTypeManager,
		property,
	});
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
	found.submenu?.items.forEach((item) => {
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

	const assignedType = metadataTypeManager.getAssignedWidget(property);
	const widgets = Object.values(metadataTypeManager.registeredTypeWidgets);
	const isReserved =
		reservedBuiltinPropertyNames.includes(property) ||
		widgets.some((w) => w.reservedKeys?.includes(property));

	widgets.forEach((widget) => {
		const isMatch = assignedType === widget.type;
		if (!isMatch && widget.reservedKeys) return;
		submenu.addItem((item) => {
			if (isReserved) {
				item.setDisabled(true);
			}
			if (isMatch) {
				item.setChecked(true);
			}

			const isBuiltin = !widget.type.startsWith(customPropertyTypePrefix);
			item.onClick(() => {
				console.log(property, widget.type);
				metadataTypeManager.setType(property, widget.type);
			});
			item.setTitle(widget.name()).setIcon(widget.icon);

			if (!isBuiltin) {
				item.dom.setAttribute("data-is-better-properties", "true");
			}

			// TODO make this an optional in settings
			// item.setSection(isBuiltin ? OBSIDIAN : BETTER_PROPERTIES);
		});
	});
};
