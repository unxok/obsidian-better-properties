import { BetterProperties } from "#/Plugin";
import { PropertyRenderContext } from "obsidian-typings";
import { SelectOption, StandardSelectSettings } from "./types";
import { Notice } from "obsidian";
import { hashString } from "#/lib/utils";

export const getFormulaOptions = ({
	plugin,
	context,
	settings,
}: {
	plugin: BetterProperties;
	context: PropertyRenderContext;
	settings: StandardSelectSettings;
}): SelectOption[] => {
	const { formula } = settings;

	const containingFile =
		plugin.app.vault.getFileByPath(context.sourcePath) ?? undefined;

	const options = plugin.baseUtilityManager.evaluateFormula({
		formula,
		containingFile,
	});

	const normalized = plugin.baseUtilityManager.normalizeFormulaValue(options);
	if (!Array.isArray(normalized)) {
		const msg = `Could not get options from formula for Select property "${
			context.key
		}": Expected array but got ${typeof normalized}`;
		console.error(msg);
		new Notice(msg);
		return [];
	}

	const {
		appearanceSettings: { colors },
	} = plugin.getSettings();
	const transformed: SelectOption[] = [];

	normalized.forEach((opt) => {
		if (
			typeof opt === "string" ||
			typeof opt === "number" ||
			typeof opt === "boolean"
		) {
			transformed.push({
				value: opt.toString(),
				background:
					colors[hashString(opt.toString()) % colors.length].background,
			});
			return;
		}
		if (!Array.isArray(opt)) return;

		const arr: unknown[] = opt;

		transformed.push({
			value: arr[0]?.toString() ?? "",
			label: arr[1]?.toString(),
			background:
				arr[2]?.toString() ??
				colors[hashString(arr[0]?.toString() ?? "") % colors.length].background,
		});
	});

	return transformed;
};
