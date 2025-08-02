import { TextComponent, setIcon, ButtonComponent } from "obsidian";
import { ConfirmationModal } from "~/Classes/ConfirmationModal";
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

	modal.setTitle("Rename property").setContent(
		createFragment((frag) => {
			frag.createEl("p", {
				text: `Enter a new name to change all instances of the "${property}" property in all notes' properties and this plugin's settings`,
			});
			const textCmp = new TextComponent(frag.createDiv())
				.setValue(property)
				.setPlaceholder("new property name");
			const warningEl = frag.createEl("p", {
				cls: "better-properties-mod-warning",
			});
			setIcon(warningEl.createSpan(), "lucide-alert-circle" satisfies Icon);
			warningEl.createSpan({
				text: `Warning: The name you entered already exists. If you continue, the existing configuration for that name will be overwritten with the configuration from "${property}"`,
			});
			let renameBtn: ButtonComponent | null = null;
			modal
				.addFooterButton((btn) => {
					renameBtn = btn
						.setButtonText("Rename")
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
					btn.setButtonText("Cancel").onClick(() => {
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
				const existing = findKey(plugin.app.metadataTypeManager.properties, v);
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
