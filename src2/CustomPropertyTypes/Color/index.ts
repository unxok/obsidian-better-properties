import { text } from "~/i18next";
import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";

export const colorPropertyType: CustomPropertyType = {
	type: "color",
	name: () => text("customPropertyTypes.color.name"),
	icon: "lucide-paintbrush",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
};
