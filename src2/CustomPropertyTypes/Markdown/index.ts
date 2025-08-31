import { text } from "~/i18next";
import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";

export const markdownPropertyType: CustomPropertyType = {
	type: "markdown",
	name: () => text("customPropertyTypes.markdown.name"),
	icon: "lucide-m-square",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
};
