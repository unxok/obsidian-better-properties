import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { text } from "~/i18next";
import { obsidianText } from "~/i18next/obsidian";
import { deleteProperty } from "~/lib/utils";
import BetterProperties from "~/main";

export const openDeleteModal = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	const modal = new ConfirmationModal(plugin.app)
		.setTitle(text("metadataEditor.propertyMenu.delete.modalTitle"))
		.setContent(
			text("metadataEditor.propertyMenu.delete.modalTitle", { property })
		)
		.setFooterCheckbox((checkbox) => {
			checkbox
				.setValue(false)
				.setLabel(text("common.dontAskAgain"))
				.onChange(async (b) => {
					await plugin.updateSettings((s) => {
						s.confirmPropertyDelete = b;
						return s;
					});
				});
		})
		.addFooterButton((btn) =>
			btn
				.setWarning()
				.setButtonText(obsidianText("interface.delete-action-short-name"))
				.onClick(async () => {
					await deleteProperty({
						plugin,
						property,
					});
					modal.close();
				})
		)
		.addFooterButton((btn) =>
			btn.setButtonText(obsidianText("dialogue.button-cancel")).onClick(() => {
				modal.close();
			})
		);
	modal.open();
	return;
};
