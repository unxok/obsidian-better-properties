import BetterProperties from "~/main";
import { CustomPropertyType } from "../types";
import { refreshPropertyEditor } from "~/MetadataEditor";
import { TITLE } from "~/lib/constants";

export const registerListeners: CustomPropertyType<string>["registerListeners"] =
	(plugin: BetterProperties) => {
		plugin.registerEvent(
			plugin.app.vault.on("rename", () => {
				refreshPropertyEditor(plugin, TITLE);
			})
		);
	};
