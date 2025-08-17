import { TITLE } from "~/lib/constants";
import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import { moment } from "obsidian";

export const createdPropertyType: CustomPropertyType<number> = {
	type: "created",
	name: () => "Created",
	default: () => 0,
	icon: "lucide-clock-10",
	validate: (v) => typeof v === "string" && moment(v).isValid(),
	registerListeners,
	renderSettings,
	renderWidget,
	reservedKeys: [TITLE],
};
