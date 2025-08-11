import { TITLE } from "~/lib/constants";
import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";

export const titlePropertyType: CustomPropertyType<string> = {
	type: "title",
	name: () => "Title",
	default: () => "",
	icon: "lucide-letter-text",
	validate: (v) => typeof v === "string",
	registerListeners,
	renderSettings,
	renderWidget,
	reservedKeys: [TITLE],
	onStartup: () => {},
};
