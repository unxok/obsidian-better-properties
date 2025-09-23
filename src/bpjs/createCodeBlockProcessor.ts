import {
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	Component,
	Plugin,
} from "obsidian";
import BetterProperties from "~/main";
import { BpJsApi } from "./api";

export const createCodeBlockProcessor = (
	plugin: BetterProperties
): Parameters<Plugin["registerMarkdownCodeBlockProcessor"]> => {
	const cb = (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => {
		el.classList.add("better-properties-bpjs-codeblock");
		const mdrc = new MarkdownRenderChild(el);
		mdrc.onunload = () => {
			console.log("mdrc unloaded");
		};
		ctx.addChild(mdrc);
		const component = new Component();
		mdrc.addChild(component);
		plugin.addChild(component);
		const api = new BpJsApi(plugin, el, ctx.sourcePath, component, source);
		api.run(source);
		// api.monitorSubsribedPaths();
	};

	const BPJS = "bpjs";

	window.CodeMirror.defineMode(BPJS, (config) =>
		window.CodeMirror.getMode(config, "javascript")
	);
	return [BPJS, cb];
};
