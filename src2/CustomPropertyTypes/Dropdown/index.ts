import { CustomPropertyType, CustomTypeKey } from "..";
import { renderWidget } from "./renderWidget";
import { renderSettings } from "./renderSettings";

export const typeKey = "dropdown" satisfies CustomTypeKey;

export const dropdownPropertyType: CustomPropertyType<string> = {
	type: typeKey,
	icon: "lucide-circle-chevron-down",
	default: () => "",
	name: () => "Dropdown",
	validate: (v) => typeof v?.toString() === "string",
	renderWidget,
	renderSettings,
};
