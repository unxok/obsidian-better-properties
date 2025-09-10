import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
}) => {
	const { tabContentEl } = modal;

	new Setting(tabContentEl)
		.setName(text("common.nothingToSeeHere"))
		.setDesc(text("common.typeHasNoSettings"));
};
