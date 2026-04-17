import { SettingGroup, TextAreaComponent } from "obsidian";
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

	new SettingGroup(containerEl).addSetting((s) => {
		s.setName(t("formula.settings.formulaName")).setDesc(
			t("formula.settings.formulaDesc")
		);

		const containerEl = s.controlEl.createDiv({
			cls: "better-properties--formula-setting-container",
		});
		const textComponent = new TextAreaComponent(containerEl).setValue(
			settings.formula
		);

		// const previewEl = containerEl.createDiv({
		// 	cls: "better-properties--formula-setting-preview",
		// });

		textComponent.onChange(async (v) => {
			await updateSettings((prev) => ({ ...prev, formula: v }));
			await plugin.formulaSyncManager.updateCachedFilesFormulas();
			// const [data] = await plugin.baseUtilityManager.evaluateFormulas({
			// 	formulas: [v],
			// 	containingFile:
			// 		plugin.app.vault.getFileByPath(
			// 			plugin.app.workspace.getRecentFiles({ maxCount: 1 })[0]
			// 		) ?? undefined,
			// });

			// previewEl.empty();
			// data?.renderTo(previewEl, plugin.app.renderContext);
			// await plugin.formulaSyncManager.updateCachedFilesFormulas();
		});
	});
}) satisfies CustomPropertyType["renderSettings"];
