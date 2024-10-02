import { Modal, Setting } from "obsidian";
import { metdataSectionId } from "@/libs/constants";
import { MetadataAddItemProps } from "..";

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
			.setTitle("Delete")
			.setWarning(true)
			.onClick(() => {
				const modal = new Modal(app).setTitle(
					'Delete property "' + key + '"'
				);
				modal.contentEl.createEl("p", {
					text: "Delete this property from all notes that contain it.",
				});
				modal.contentEl.createEl("p", {
					text: "Warning: This update is permanent and may affect many notes at once!",
					cls: "better-properties-text-error",
				});

				new Setting(modal.contentEl).addButton((cmp) =>
					cmp
						.setButtonText("delete")
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
