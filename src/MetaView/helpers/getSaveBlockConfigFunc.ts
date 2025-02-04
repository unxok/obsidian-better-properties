import BetterProperties from "@/main";
import { MarkdownPostProcessorContext, stringifyYaml } from "obsidian";
import { BlockConfig } from "../shared";

export const getSaveBlockConfigFunc = ({
	plugin,
	ctx,
	el,
}: {
	plugin: BetterProperties;
	ctx: MarkdownPostProcessorContext;
	el: HTMLElement;
}) => {
	const saveBlockConfig = async (newConfig: BlockConfig) => {
		const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
		if (!file) {
			console.error(
				"Failed to update block. File not found at: ",
				ctx.sourcePath
			);
			return;
		}
		const stringified = stringifyYaml(newConfig);
		const chars = stringified.split("");
		// stringifyYaml adds an extra new line character at the end of the string
		chars.pop();
		const finalStr = chars.join("");
		await plugin.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const info = ctx.getSectionInfo(el);
			if (!info) {
				console.error(
					`Failed to update block. Section info returned null.\nctx: ${ctx}\nel: ${el}`
				);
				return content;
			}
			const { lineStart, lineEnd } = info;
			const start = lineStart + 1;
			lines.splice(start, lineEnd - start, finalStr);
			const newContent = lines.join("\n");
			return newContent;
		});
	};
	return saveBlockConfig;
};
