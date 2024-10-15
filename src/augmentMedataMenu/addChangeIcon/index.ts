import { Modal, SearchComponent, Setting } from "obsidian";
import { metdataSectionId } from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { IconSuggest } from "@/classes/IconSuggest";

export const addChangeIcon = ({ plugin, menu, key }: MetadataAddItemProps) => {
	const { app } = plugin;
	const trueKey = key.toLowerCase();
	menu.addItem((item) =>
		item
			.setSection(metdataSectionId)
			.setIcon("stars")
			.setTitle("Change icon")
			.onClick(() => {
				const icon = plugin.getPropertySetting(key).general.customIcon;

				const modal = new Modal(app).setTitle(
					'Change icon for "' + key + '"'
				);

				let searchCmp: SearchComponent;
				new Setting(modal.contentEl).setName("Icon").addSearch((cmp) =>
					cmp.setValue(icon).then((cmp) => {
						searchCmp = cmp;
						new IconSuggest(app, cmp);
					})
				);

				new Setting(modal.contentEl).addButton((cmp) =>
					cmp
						.setCta()
						.setButtonText("update")
						.onClick(async () => {
							await plugin.updatePropertySetting(key, (prev) => ({
								...prev,
								general: {
									...prev.general,
									customIcon: searchCmp.getValue(),
								},
							}));
							modal.close();
							plugin.refreshPropertyEditor(trueKey);
						})
				);

				modal.open();
			})
	);
};
