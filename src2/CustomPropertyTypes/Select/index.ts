import { CustomPropertyType, CustomTypeKey } from "..";
import { renderWidget } from "./renderWidget";
import { renderSettings } from "./renderSettings";
import { registerListeners } from "./registerListeners";
import { text } from "~/i18next";

export const typeKey = "select" satisfies CustomTypeKey;

export const selectPropertyType: CustomPropertyType = {
	type: typeKey,
	icon: "lucide-circle-chevron-down",
	name: () => text("customPropertyTypes.select.name"),
	validate: (v) => typeof v?.toString() === "string",
	renderWidget,
	registerListeners,
	renderSettings,
};
