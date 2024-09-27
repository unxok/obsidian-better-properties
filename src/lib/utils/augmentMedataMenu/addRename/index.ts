import { Modal, TextComponent, Setting } from "obsidian";
import { metdataSectionId } from "src/lib/constants";
import { MetadataAddItemProps } from "..";

export const addRename = ({
	plugin,
	menu,
	files,
	key,
}: MetadataAddItemProps) => {
	const { app } = plugin;
	const { metadataTypeManager, fileManager, vault } = app;
	menu.addItem((item) =>
		item
			.setSection(metdataSectionId)
			.setIcon("pencil")
			.setTitle("Rename")
			.onClick(() => {
				const modal = new Modal(app).setTitle(
					'Rename property "' + key + '"'
				);
				modal.contentEl.createEl("p", {
					text: "Rename this property for all notes that contain it.",
				});
				modal.contentEl.createEl("p", {
					text: "Warning: This update is permanent and may affect many notes at once!",
					cls: "properties-plus-plus-text-error",
				});
				let nameCmp: TextComponent;
				const setting = new Setting(modal.contentEl)
					.setName("New property name")
					.setDesc("The new name to rename the property to.");

				const errorEl = setting.descEl.createEl("p", {
					text: "Property name already in use!",
					cls: "properties-plus-plus-text-error",
					attr: { style: "display: none;" },
				});

				setting.addText((cmp) =>
					cmp
						.onChange((v) => {
							// obsidian will trim any white space normally
							const value = v.trim();
							const isExist =
								!!metadataTypeManager.getPropertyInfo(value);
							if (isExist) {
								errorEl.style.display = "block";
								return;
							}
							errorEl.style.display = "none";
						})
						.setValue(key)
						.then((cmp) => (nameCmp = cmp))
						.onChanged()
				);

				new Setting(modal.contentEl).addButton((cmp) =>
					cmp
						.setButtonText("rename")
						.setCta()
						.onClick(async () => {
							const value = nameCmp.getValue().trim();
							await Promise.all(
								files.map(async ({ path }) => {
									const file = vault.getFileByPath(path);
									if (!file) return;
									await fileManager.processFrontMatter(
										file,
										(fm) => {
											fm[value] = fm[key];
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
