import { metdataSectionId } from "src/lib/constants";
import { MetadataAddItemProps } from "..";

export const addSettings = ({ menu }: MetadataAddItemProps) => {
	menu.addItem((item) =>
		item.setSection(metdataSectionId).setIcon("wrench").setTitle("Settings")
	);
};
