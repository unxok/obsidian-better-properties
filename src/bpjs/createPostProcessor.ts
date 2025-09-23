import {
	MarkdownPostProcessor,
	MarkdownRenderChild,
	Component,
} from "obsidian";
import BetterProperties from "~/main";
import { BpJsApi } from "./api";

export const createPostProcessor = (
	plugin: BetterProperties
): MarkdownPostProcessor => {
	const processor: MarkdownPostProcessor = (el, ctx) => {
		if (el.tagName.toLowerCase() !== "code") {
			el.findAll("code").forEach((codeEl) => processor(codeEl, ctx));
			return;
		}

		if (!el.textContent.startsWith(plugin.codePrefix)) return;

		const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
		if (!file) {
			throw new Error(`File not found at path "${ctx.sourcePath}"`);
		}

		const code = el.textContent.slice(plugin.codePrefix.length);
		const spanEl = createSpan({ cls: "better-properties-bpjs-code" });
		el.replaceWith(spanEl);
		const mdrc = new MarkdownRenderChild(spanEl);
		ctx.addChild(mdrc);
		const component = new Component();
		mdrc.addChild(component);
		plugin.addChild(component);
		const api = new BpJsApi(plugin, spanEl, ctx.sourcePath, component, code);
		api.run(code);
	};
	return processor;
};
