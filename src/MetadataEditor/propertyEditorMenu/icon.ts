import { Setting } from "obsidian";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { IconSuggest } from "~/classes/InputSuggest/IconSuggest";
import { getPropertyTypeSettings } from "~/CustomPropertyTypes";
import { updatePropertyTypeSettings } from "~/CustomPropertyTypes/utils";
import BetterProperties from "~/main";
import { refreshPropertyEditor } from "..";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";

export const openChangeIconModal = ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	const modal = new ConfirmationModal(plugin.app);
	let icon: string =
		getPropertyTypeSettings({ plugin, property, type: "general" })?.icon ?? "";

	modal.setTitle(
		text("metadataEditor.propertyMenu.icon.modalTitle", { property })
	);

	new Setting(modal.contentEl)
		.setName(text("metadataEditor.propertyMenu.icon.iconSetting.title"))
		.setDesc(text("metadataEditor.propertyMenu.icon.iconSetting.desc"))
		.addSearch((cmp) => {
			cmp.setValue(icon).onChange((v) => {
				icon = v;
			});
			new IconSuggest(plugin.app, cmp.inputEl).onSelect((v) => {
				cmp.setValue(v);
				cmp.onChanged();
			});
		});

	modal
		.addFooterButton((btn) =>
			btn.setButtonText(obsidianText("dialogue.button-cancel")).onClick(() => {
				modal.close();
			})
		)
		.addFooterButton((btn) =>
			btn
				.setButtonText(obsidianText("dialogue.button-update"))
				.setCta()
				.onClick(() => {
					updatePropertyTypeSettings({
						plugin,
						property,
						type: "general",
						cb: (s) => ({ ...s, icon }),
					});
					refreshPropertyEditor(plugin, property);
					modal.close();
				})
		);

	modal.open();
};
