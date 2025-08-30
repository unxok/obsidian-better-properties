import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";

export const groupPropertyType: CustomPropertyType = {
	type: "group",
	name: () => "Group",
	icon: "lucide-braces",
	validate: (v) =>
		v === null ||
		v === undefined ||
		(typeof v === "object" && !Array.isArray(v)),
	registerListeners,
	renderSettings,
	renderWidget,
};
