import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
}) => {
	const { tabContentEl } = modal;

	new Setting(tabContentEl)
		.setName("Nothing to see here!")
		.setDesc("This type has no settings available");
};
