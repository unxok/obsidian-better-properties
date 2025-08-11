import { Setting } from "obsidian";
import { ConfirmationModal } from "~/Classes/ConfirmationModal";
import { IconSuggest } from "~/Classes/InputSuggest/IconSuggest";
import { getPropertyTypeSettings } from "~/CustomPropertyTypes";
import { updatePropertyTypeSettings } from "~/CustomPropertyTypes/utils";
import BetterProperties from "~/main";
import { refreshPropertyEditor } from "..";

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

	modal.setTitle(`Change icon for property "${property}"`);

	new Setting(modal.contentEl)
		.setName("Icon")
		.setDesc("The icon to show for this property")
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
			btn.setButtonText("Cancel").onClick(() => {
				modal.close();
			})
		)
		.addFooterButton((btn) =>
			btn
				.setButtonText("Change")
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
