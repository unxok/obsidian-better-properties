import { MarkdownPostProcessor, MarkdownRenderChild } from "obsidian";
import { BetterProperties } from "#/Plugin";
import { initPropertyLinkRender } from "./renderer";

/**
 * Creates the markdown-post-processor for rendering property links in reading mode
 */
export const createPropertyLinkRendererPostProcessor = (
	plugin: BetterProperties
): MarkdownPostProcessor => {
	const processor: MarkdownPostProcessor = async (el, ctx) => {
		const { propertyLinkSyntax } = plugin.getSettings();
		const matcher = `a[data-href*="#${propertyLinkSyntax}"]`;

		if (!el.matches(matcher)) {
			const promises = el.findAll(matcher).map(async (aEl) => {
				await processor(aEl, ctx);
			});
			await Promise.all(promises);
			return;
		}

		const containingFile =
			plugin.app.vault.getFileByPath(ctx.sourcePath) ?? undefined;
		if (!containingFile) return;

		const href = el.getAttribute("data-href") ?? "";
		const parsed = plugin.propertyLinkManager.parsePropertyLink(
			href,
			containingFile
		);

		if (!parsed?.property) return;

		const { property, file } = parsed;

		const containerEl = window.createSpan(
			"better-properties--property-link-container"
		);
		el.replaceWith(containerEl);
		const component = new MarkdownRenderChild(containerEl);
		ctx.addChild(component);

		initPropertyLinkRender({
			plugin,
			file,
			component,
			containerEl,
			property,
			hideKey: false,
		});
	};
	return processor;
};
