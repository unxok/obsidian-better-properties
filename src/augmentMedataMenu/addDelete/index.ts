import { Modal, Setting } from "obsidian";
import { metdataSectionId } from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { text } from "@/i18Next";

export const addDelete = ({
	plugin,
	menu,
	files,
	key,
}: MetadataAddItemProps) => {
	const { app } = plugin;
	const { fileManager, vault } = app;
	menu.addItem((item) =>
		item
			.setSection(metdataSectionId)
			.setIcon("trash")
			.setTitle(
				text("augmentedPropertyMenu.delete.menuItemTitle", { key })
			)
			.setWarning(true)
			.onClick(() => {
				const modal = new Modal(app).setTitle(
					text("augmentedPropertyMenu.delete.confirmationModal.title")
				);
				modal.contentEl.createEl("p", {
					text: text(
						"augmentedPropertyMenu.delete.confirmationModal.desc"
					),
				});
				modal.contentEl.createEl("p", {
					text: text(
						"augmentedPropertyMenu.delete.confirmationModal.warning"
					),
					cls: "better-properties-text-error",
				});

				new Setting(modal.contentEl).addButton((cmp) =>
					cmp
						.setButtonText(text("buttonText.delete"))
						.setWarning()
						.onClick(async () => {
							await Promise.all(
								files.map(async ({ path }) => {
									const file = vault.getFileByPath(path);
									if (!file) return;
									await fileManager.processFrontMatter(
										file,
										(fm) => {
											delete fm[key];
										}
									);
								})
							);
							modal.close();
						})
				);

				modal.open();
			})
	);
};
