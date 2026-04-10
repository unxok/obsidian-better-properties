import { setIcon, setTooltip } from "obsidian";
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
	});

	const renderedFormulaContainerEl = widgetEl.createDiv({
		cls: "better-properties--rendered-formula",
		text: isSimple ? value?.toString() : "",
	});

	const iconEl = widgetEl.createDiv({ cls: "clickable-icon" });
	setIcon(iconEl, "lucide-edit-2");
	setTooltip(iconEl, "Edit formula");
	iconEl.classList.add("better-properties--mod-loading");
	iconEl.addEventListener("click", () => {
		renderedFormulaContainerEl.remove();
		iconEl.remove();

		const { formula } = getSettings();

		const editorEl = widgetEl.createDiv({
			cls: "better-properties--formula-editor",
			attr: {
				"spellcheck": "false",
				"autocorrect": "off",
				"autocapitalize": "off",
				"writingSuggestions": "false",
				"translate": "no",
				"contenteditable": "true",
				"aria-multitline": "true",
				"aria-placeholder": "x + y",
				"aria-autocomplete": "list",
				// "autofocus": "true",
			},
			text: formula,
		});

		editorEl.addEventListener("blur", async () => {
			const newFormula = editorEl.textContent;

			editorEl.remove();
			widgetEl.appendChild(renderedFormulaContainerEl);
			widgetEl.appendChild(iconEl);

			if (formula === newFormula) return;

			setTooltip(widgetEl, newFormula);
			await updateSettings((prev) => ({
				...prev,
				formula: newFormula,
			}));
			await plugin.formulaSyncManager.updateCachedFilesFormulas();
		});

		editorEl.focus();
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(editorEl);
		selection?.removeAllRanges();
		selection?.addRange(range);
	});

	setTooltip(widgetEl, getSettings().formula);

	const renderFormula = async (formula: string) => {
		const formulaInstance =
			plugin.baseUtilityManager.createBasesFormula(formula);

		if (formulaInstance.formula.type === "invalid") {
			iconEl.classList.remove("better-properties--mod-loading");
			const errorEl = renderedFormulaContainerEl.createDiv({
				cls: "bases-formula-error",
			});
			setIcon(
				errorEl.createDiv({ cls: "warning-icon" }),
				"lucide-alert-triangle"
			);
			errorEl.createDiv({
				cls: "bases-formula-error-message",
				text: formulaInstance.formula.parseError,
			});
			return;
		}

		const [data] = await plugin.baseUtilityManager.evaluateFormulas({
			formulas: [formula],
			containingFile:
				plugin.app.vault.getFileByPath(context.sourcePath) ?? undefined,
		});

		// if (error) {
		// 	setIcon(widgetEl.createSpan(), "lucide-x-circle");
		// 	widgetEl.appendText(error);
		// 	return;
		// }

		renderedFormulaContainerEl.empty();
		data?.renderTo(renderedFormulaContainerEl, plugin.app.renderContext);
		iconEl.classList.remove("better-properties--mod-loading");

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
