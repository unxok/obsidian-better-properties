import { metdataSectionId } from "@/libs/constants";
import { MetadataAddItemProps } from "..";

export const addUsedBy = ({ plugin, menu, files }: MetadataAddItemProps) => {
	menu.addItem((item) => {
		item.setSection(metdataSectionId)
			.setIcon("info")
			.setTitle("Used by " + files.length + " notes");
		if (!files?.length) return;
		const subMenu = item.setSubmenu().setNoIcon();

		files.forEach(({ path, value }) => {
			subMenu.addItem((sub) => {
				const frag = new DocumentFragment();
				frag.createSpan({ text: path });
				frag.createEl("br");
				frag.createSpan({
					text: value?.toString(),
					cls: "properties-plus-plus-menu-item-note",
				});
				sub.setTitle(frag).onClick(async () => {
					await plugin.app.workspace.openLinkText("", path);
				});
			});
		});
	});
};
