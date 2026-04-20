import { BetterProperties } from "#/Plugin";
import { setIcon, TFile } from "obsidian";

export const initInlineFormulaRenderer = ({
	plugin,
	containerEl,
	formula,
	containingFile,
}: {
	plugin: BetterProperties;
	containerEl: HTMLElement;
	formula: string;
	containingFile: TFile;
}) => {
	const renderer = new InlineFormulaRenderer(
		plugin,
		containerEl,
		formula,
		containingFile
	);

	renderer.render();
	plugin.formulaSyncManager.renderers.add(renderer);

	return renderer;
};

export class InlineFormulaRenderer {
	formulaContainerEl: HTMLElement;

	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public formula: string,
		public containingFile: TFile
	) {
		this.formulaContainerEl = containerEl.createDiv({
			cls: "inline-formula-container",
		});
	}

	render(): void {
		const { plugin, formula, containingFile, formulaContainerEl } = this;

		const formulaInstance =
			plugin.baseUtilityManager.createBasesFormula(formula);

		if (formulaInstance.formula.type === "invalid") {
			formulaContainerEl.empty();
			const errorEl = formulaContainerEl.createDiv({
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

		const output = plugin.baseUtilityManager.evaluateFormula({
			formula: formulaInstance,
			containingFile,
		});

		formulaContainerEl.empty();
		output.renderTo(formulaContainerEl, plugin.app.renderContext);
	}
}
