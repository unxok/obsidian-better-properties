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
				// const warningEl = frag.createEl("p", {
				// 	cls: "better-properties-mod-warning",
				// });
				const warningEl = createCallout({
					parentEl: frag,
					type: "warning",
					icon: "lucide-alert-triangle",
					title: "Existing property name",
					desc: text("metadataEditor.propertyMenu.rename.nameExistsWarning", {
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
						warningEl.classList.add("better-properties-mod-hidden");
						renameBtn.setDisabled(true);
						return;
					}
					renameBtn.setDisabled(false);
					const existing = findKey(
						plugin.app.metadataTypeManager.properties,
						v
					);
					if (!existing) {
						warningEl.classList.add("better-properties-mod-hidden");
						return;
					}
					warningEl.classList.remove("better-properties-mod-hidden");
				});

				textCmp.onChanged();
			})
		);

	modal.open();
};

const createCallout = ({
	parentEl,
	type,
	icon,
	title,
	desc,
}: {
	parentEl: HTMLElement | DocumentFragment;
	type: string;
	icon: Icon;
	title: string;
	desc: string;
}) => {
	const calloutEl = parentEl.createDiv({
		cls: "callout",
		attr: {
			"data-callout": type,
		},
	});
	const titleEl = calloutEl.createDiv({
		cls: "callout-title",
		attr: { dir: "auto" },
	});
	setIcon(titleEl.createDiv({ cls: "callout-icon" }), icon);
	titleEl.createDiv({ cls: "callout-title-inner", text: title });
	calloutEl
		.createDiv({ cls: "callout-content" })
		.createEl("p", { text: desc, attr: { dir: "auto" } });
	return calloutEl;
};
