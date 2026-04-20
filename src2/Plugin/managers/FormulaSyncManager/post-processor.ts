import { MarkdownPostProcessor, MarkdownRenderChild } from "obsidian";
import { BetterProperties } from "#/Plugin";
import { initInlineFormulaRenderer } from "./renderer";

/**
 * Creates the markdown-post-processor for rendering inline formulas in reading mode
 */
export const createInlineFormulaRendererPostProcessor = (
	plugin: BetterProperties
): MarkdownPostProcessor => {
	const processor: MarkdownPostProcessor = (el, ctx) => {
		const { inlineFormulaSyntax } = plugin.getSettings();

		if (el.tagName.toLowerCase() !== "code") {
			el.findAll("code").forEach((codeEl) => {
				void processor(codeEl, ctx);
			});
			return;
		}

		if (!el.textContent.startsWith(inlineFormulaSyntax)) {
			return;
		}

		const formula = el.textContent.slice(inlineFormulaSyntax.length);

		const containingFile =
			plugin.app.vault.getFileByPath(ctx.sourcePath) ?? undefined;
		if (!containingFile) return;

		const containerEl = window.createSpan();
		el.replaceWith(containerEl);
		const component = new MarkdownRenderChild(containerEl);
		ctx.addChild(component);

		const renderer = initInlineFormulaRenderer({
			plugin,
			containingFile,
			containerEl,
			formula,
		});

		component.register(() => {
			plugin.formulaSyncManager.renderers.delete(renderer);
		});
	};
	return processor;
};
