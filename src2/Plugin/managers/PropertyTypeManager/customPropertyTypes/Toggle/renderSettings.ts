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

	new SettingGroup(containerEl).addSetting((s) => {
		s.setName("Test").addText((cmp) => {
			cmp.setValue(settings.test).onChange(async (v) => {
				await updateSettings((prev) => ({ ...prev, test: v }));
			});
		});
	});
}) satisfies CustomPropertyType["renderSettings"];
