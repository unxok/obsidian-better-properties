import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";

export const markdownPropertyType: CustomPropertyType<string> = {
	type: "markdown",
	name: () => "Markdown",
	default: () => "",
	icon: "lucide-m-square",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
};
