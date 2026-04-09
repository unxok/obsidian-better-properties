import { setTooltip } from "obsidian";
import { CustomPropertyType } from "../../types";
import { PropertySettings } from "../../schema";
import typeKey from "./type";

type Settings = PropertySettings["types"][typeof typeKey];

export default (({ plugin, containerEl, data, context }) => {
	const getSettings = () =>
		plugin.propertyTypeManager.getPropertyTypeSettings(context.key, typeKey);
	const updateSettings = async (cb: (s: Settings) => Settings) => {
		await plugin.propertyTypeManager.updatePropertyTypeSettings(
			context.key,
			typeKey,
			cb
		);
	};

	const value = data;
	const valueStr = value?.toString() ?? "";

	const isSimple =
		typeof value !== "object" &&
		!valueStr.startsWith("[[") &&
		!(valueStr in plugin.app.vault.fileMap);

	const widgetEl = containerEl.createDiv({
		cls: "better-properties--formula-widget-container metadata-input-longtext",
		text: isSimple ? value?.toString() : "",
	});

	setTooltip(widgetEl, getSettings().formula);

	const renderFormula = async (formula: string) => {
		if (!isSimple) {
			widgetEl.classList.add("better-properties--mod-loading");
		}
		const [data] = await plugin.baseUtilityManager.evaluateFormulas({
			formulas: [formula],
			containingFile:
				plugin.app.vault.getFileByPath(context.sourcePath) ?? undefined,
		});

		widgetEl.empty();
		// if (error) {
		// 	setIcon(widgetEl.createSpan(), "lucide-x-circle");
		// 	widgetEl.appendText(error);
		// 	return;
		// }

		data?.renderTo(widgetEl, plugin.app.renderContext);
		widgetEl.classList.remove("better-properties--mod-loading");

		// console.log("data", data);
		// const str = data?.toString();
		// if (value === str) return;

		// context.onChange(str);
	};

	void renderFormula(getSettings().formula);

	return {
		focus() {
			widgetEl.focus();
		},
	};
}) satisfies CustomPropertyType["renderWidget"];
