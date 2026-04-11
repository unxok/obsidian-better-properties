import { CustomPropertyType } from "../../types";
import typeKey from "./type";
import { renderStandardSelectSettings } from "./utils/renderStandardSelectSettings";

export default (({ plugin, containerEl, propertyName, modal }) => {
	const getSettings = () =>
		plugin.propertyTypeManager.getPropertyTypeSettings(propertyName, typeKey);
	const settings = getSettings();

	const updateSettings = async (
		cb: (s: typeof settings) => typeof settings
	) => {
		await plugin.propertyTypeManager.updatePropertyTypeSettings(
			propertyName,
			typeKey,
			cb
		);
	};

	const reRenderModal = () => {
		modal.contentEl.empty();
		modal.onOpen();
	};

	renderStandardSelectSettings({
		plugin,
		containerEl,
		getSettings,
		updateSettings,
		reRenderModal,
	});
}) satisfies CustomPropertyType["renderSettings"];
