import { SettingGroup } from "obsidian";
import typeKey from "./type";
import { CustomPropertyType } from "../../types";
import { t } from "#/i18n";

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
		s.setName(t("common.typeHasNoSettings"));
	});
}) satisfies CustomPropertyType["renderSettings"];
