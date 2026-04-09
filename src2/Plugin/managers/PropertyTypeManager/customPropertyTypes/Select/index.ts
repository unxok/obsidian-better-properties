import renderWidget from "./renderWidget";
import registerListeners from "./registerListeners";
import renderSettings from "./renderSettings";
import settingsSchema from "./settingsSchema";
import { CustomPropertyType } from "../../types";
import "./index.css";

// so eslint doesn't warn for unused import
void settingsSchema;

/**
 * settings - {@link settingsSchema}
 */
export default {
	icon: "lucide-chevron-down-circle",
	name: () => "Select",
	validate: (value) => typeof value === "string",
	docsLink: "https://example.com",
	renderWidget,
	registerListeners,
	renderSettings,
} satisfies CustomPropertyType;
