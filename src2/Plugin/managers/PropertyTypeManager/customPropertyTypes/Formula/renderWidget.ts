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

	const iconEl = widgetEl.createDiv({
		cls: "clickable-icon",
		attr: {
			tabindex: "0",
		},
	});
	setIcon(iconEl, "lucide-edit-2");
	setTooltip(iconEl, "Edit formula");
	iconEl.classList.add("better-properties--mod-loading");

	const onClickIcon = () => {
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
	};

	iconEl.addEventListener("click", () => {
		onClickIcon();
	});
	iconEl.addEventListener("keydown", (e) => {
		if (e.key !== "Enter" && e.key !== " ") return;
		e.preventDefault();
		onClickIcon();
	});

	setTooltip(widgetEl, getSettings().formula);

	const renderFormula = (formula: string) => {
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
				text: formulaInstance.formula.getErrorMessage(),
			});
			return;
		}

		const data = plugin.baseUtilityManager.evaluateFormula({
			formula,
			containingFile:
				plugin.app.vault.getFileByPath(context.sourcePath) ?? undefined,
		});

		renderedFormulaContainerEl.empty();
		data?.renderTo(renderedFormulaContainerEl, plugin.app.renderContext);
		iconEl.classList.remove("better-properties--mod-loading");
	};

	renderFormula(getSettings().formula);

	return {
		focus() {
			iconEl.focus();
		},
	};
}) satisfies CustomPropertyType["renderWidget"];
