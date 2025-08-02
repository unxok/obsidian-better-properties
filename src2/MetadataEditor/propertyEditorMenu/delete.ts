import { ConfirmationModal } from "~/Classes/ConfirmationModal";
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
		.setTitle("Are you sure?")
		.setContent(
			`This action will permanently remove the property "${property}" from all notes, delete property configurations in this plugin's settings, and cannot be undone.`
		)
		.setFooterCheckbox((checkbox) => {
			checkbox
				.setValue(false)
				.setLabel("Don't ask again")
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
				.setButtonText("Delete")
				.onClick(async () => {
					await deleteProperty({
						plugin,
						property,
					});
					modal.close();
				})
		)
		.addFooterButton((btn) =>
			btn.setButtonText("Cancel").onClick(() => {
				modal.close();
			})
		);
	modal.open();
	return;
};
