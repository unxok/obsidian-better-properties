import { text } from "~/i18next";
import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";

export const togglePropertyType: CustomPropertyType = {
	type: "toggle",
	name: () => text("customPropertyTypes.toggle.name"),
	icon: "lucide-toggle-left",
	validate: (v) => typeof v === "boolean",
	registerListeners,
	renderSettings,
	renderWidget,
};
