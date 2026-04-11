import { BetterProperties } from "#/Plugin";
import { PropertyRenderContext } from "obsidian-typings";
import { hashString, tryCatch } from "#/lib/utils";
import { Notice } from "obsidian";
import { SelectOption, StandardSelectSettings } from "./types";

/**
 * Gets options for a Select where `optionsType` is `"inline-base"` or `"base-file"`
 */
export const getBaseOptions = async ({
	plugin,
	context,
	settings,
}: {
	plugin: BetterProperties;
	context: PropertyRenderContext;
	settings: StandardSelectSettings;
}): Promise<SelectOption[]> => {
	const getQuery = async () => {
		if (settings.optionsType === "inline-base") {
			return settings.inlineBase;
		}

		const file = plugin.app.vault.getFileByPath(settings.baseFile);
		if (!file) {
			throw new Error(
				`Failed to get options for property "${context.key}": File not found at path "${settings.baseFile}"`
			);
		}
		return await plugin.app.vault.cachedRead(file);
	};

	const { success, data: query, error } = await tryCatch(getQuery());
	if (!success) {
		new Notice(error);
		return [];
	}
	const containingFile =
		plugin.app.vault.getFileByPath(context.sourcePath) ?? undefined;
	const embedComponent = await plugin.baseUtilityManager.evaluateBase({
		query,
		containingFile,
	});

	const {
		appearanceSettings: { colors },
	} = plugin.getSettings();

	const options = embedComponent.controller.results
		.values()
		.toArray()
		.map((f) => {
			const label = settings.baseLabelColumn
				? f.getValue(settings.baseLabelColumn)?.toString()
				: f.file.getShortName();

			const background = settings.baseBackgroundColumn
				? f.getValue(settings.baseBackgroundColumn)?.toString()
				: // get a random color seeded by the file path
				  colors[hashString(f.file.path) % colors.length].background;

			return {
				value: `[[${f.file.path}]]`,
				label,
				background,
			};
		});

	embedComponent.unload();
	return options;
};
