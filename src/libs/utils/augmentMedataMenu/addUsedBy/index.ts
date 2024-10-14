import { metdataSectionId } from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { Keymap } from "obsidian";
import { text } from "@/libs/i18Next";

export const addUsedBy = ({ plugin, menu, files }: MetadataAddItemProps) => {
	const noteCount = files.length;
	menu.addItem((item) => {
		item.setSection(metdataSectionId)
			.setIcon("info")
			.setTitle(
				text("augmentedPropertyMenu.usedBy.menuItemTitle", {
					noteCount,
				})
			);
		if (!files?.length) return;
		const subMenu = item.setSubmenu().setNoIcon();

		files.forEach(({ path, value }) => {
			subMenu.addItem((sub) => {
				const frag = new DocumentFragment();
				frag.createSpan({ text: path });
				frag.createEl("br");
				frag.createSpan({
					text: value?.toString(),
					cls: "better-properties-menu-item-note",
				});
				sub.setTitle(frag).onClick(async (e) => {
					await plugin.app.workspace.openLinkText(
						"",
						path,
						Keymap.isModEvent(e)
					);
				});
			});
		});
	});
};
