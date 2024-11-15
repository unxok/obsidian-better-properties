import { monkeyAroundKey } from "@/libs/constants";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import { MarkdownPreviewRenderer, MetadataCache } from "obsidian";

export const patchMarkdownPreviewRenderer = (plugin: BetterProperties) => {
	const removePatch = patch();

	plugin.register(removePatch);
};

const patch = () => {
	return around(MarkdownPreviewRenderer.prototype, {
		onHeadingCollapseClick(old) {
			return dedupe(monkeyAroundKey, old, function (e, el) {
				// @ts-ignore
				const that = this as MarkdownPreviewRenderer;

				console.log("el: ", el);

				old.call(that, e, el);
			});
		},
	});
};
