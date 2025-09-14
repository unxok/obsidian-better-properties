import { TextComponent, setIcon, ButtonComponent } from "obsidian";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { text } from "~/i18next";
import { obsidianText } from "~/i18next/obsidian";
import { Icon } from "~/lib/types/icons";
import { renameProperty, findKey } from "~/lib/utils";
import BetterProperties from "~/main";

export const openRenameModal = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	const modal = new ConfirmationModal(plugin.app);

	modal
		.setTitle(text("metadataEditor.propertyMenu.rename.modalTitle"))
		.setContent(
			createFragment((frag) => {
				frag.createEl("p", {
					text: text("metadataEditor.propertyMenu.rename.modalDesc", {
						property,
					}),
				});
				const textCmp = new TextComponent(frag.createDiv())
					.setValue(property)
					.setPlaceholder(
						text(
							"metadataEditor.propertyMenu.rename.newPropertyNamePlaceholder"
						)
					);
				const warningEl = frag.createEl("p", {
					cls: "better-properties-mod-warning",
				});
				setIcon(warningEl.createSpan(), "lucide-alert-circle" satisfies Icon);
				warningEl.createSpan({
					text: text("metadataEditor.propertyMenu.rename.nameExistsWarning", {
						property,
					}),
				});
				let renameBtn: ButtonComponent | null = null;
				modal
					.addFooterButton((btn) => {
						renameBtn = btn
							.setButtonText(obsidianText("interface.menu.rename"))
							.setWarning()
							.onClick(async () => {
								await renameProperty({
									plugin,
									property,
									newProperty: textCmp.getValue(),
								});
								modal.close();
							});
					})
					.addFooterButton((btn) =>
						btn
							.setButtonText(obsidianText("dialogue.button-cancel"))
							.onClick(() => {
								modal.close();
							})
					);

				textCmp.onChange((v) => {
					if (!renameBtn) return;
					if (v === property) {
						warningEl.style.setProperty("display", "none");
						renameBtn.setDisabled(true);
						return;
					}
					renameBtn.setDisabled(false);
					const existing = findKey(
						plugin.app.metadataTypeManager.properties,
						v
					);
					if (!existing) {
						warningEl.style.setProperty("display", "none");
						return;
					}
					warningEl.style.removeProperty("display");
				});

				textCmp.onChanged();
			})
		);

	modal.open();
};
