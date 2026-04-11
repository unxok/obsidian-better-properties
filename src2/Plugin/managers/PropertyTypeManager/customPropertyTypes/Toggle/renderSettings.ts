import { SettingGroup } from "obsidian";
import typeKey from "./type";
import { CustomPropertyType } from "../../types";

export default (({ plugin, containerEl, propertyName }) => {
	const settings = plugin.propertyTypeManager.getPropertyTypeSettings(
		propertyName,
		typeKey
	);
	const updateSettings = async (
		cb: (s: typeof settings) => typeof settings
	) => {
		await plugin.propertyTypeManager.updatePropertyTypeSettings(
			propertyName,
			typeKey,
			cb
		);
	};

	// to prevent TS warning
	void updateSettings;

	new SettingGroup(containerEl).addSetting((s) => {
		s.setName("There are no settings available for this type");
	});
}) satisfies CustomPropertyType["renderSettings"];
