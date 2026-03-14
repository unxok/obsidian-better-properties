import { CustomPropertyType } from "#/PropertyTypeManager/types";
import getWidget from "./getWidget";
import registerListeners from "./registerListeners";
import renderSettings from "./renderSettings";
import settingsSchema from "./settingsSchema";

/**
 * settings - {@link settingsSchema}
 */
export default {
	getWidget,
	registerListeners,
	renderSettings,
} satisfies CustomPropertyType<"toggle">;

export type TogglePropertyType = CustomPropertyType<"toggle">;
