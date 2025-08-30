import { CustomPropertyType, CustomTypeKey } from "..";
import { renderWidget } from "./renderWidget";
import { renderSettings } from "./renderSettings";
import { registerListeners } from "./registerListeners";

export const typeKey = "dropdown" satisfies CustomTypeKey;

export const dropdownPropertyType: CustomPropertyType = {
	type: typeKey,
	icon: "lucide-circle-chevron-down",
	name: () => "Dropdown",
	validate: (v) => typeof v?.toString() === "string",
	renderWidget,
	registerListeners,
	renderSettings,
};
