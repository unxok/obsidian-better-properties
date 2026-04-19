import renderWidget from "./renderWidget";
import renderSettings from "./renderSettings";
import settingsSchema from "./settingsSchema";
import { CustomPropertyType } from "../../types";
import "./index.css";
import "#/Plugin/managers/PropertyTypeManager/customPropertyTypes/Select/utils/shared.css";

// so eslint doesn't warn for unused import
void settingsSchema;

/**
 * settings - {@link settingsSchema}
 */
export default {
	icon: "lucide-list-collapse",
	name: () => "Multi-Select",
	validate: (value) => Array.isArray(value),
	docsLink: "https://example.com",
	renderWidget,
	renderSettings,
} satisfies CustomPropertyType;
