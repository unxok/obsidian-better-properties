import { CREATED } from "~/lib/constants";
import { CustomPropertyType } from "../types";
import { registerListeners } from "./registerListeners";
import { renderSettings } from "./renderSettings";
import { renderWidget } from "./renderWidget";
import { moment } from "obsidian";
import { text } from "~/i18next";

export const createdPropertyType: CustomPropertyType = {
	type: "created",
	name: () => text("customPropertyTypes.created.name"),
	icon: "lucide-clock-10",
	validate: (v) => typeof v === "number" && moment(v).isValid(),
	registerListeners,
	renderSettings,
	renderWidget,
	reservedKeys: [CREATED],
};
