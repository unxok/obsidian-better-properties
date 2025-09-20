import BetterProperties from "~/main";
import { createInlineCodePlugin } from "./createViewPlugin";
import { createCodeBlockProcessor } from "./createCodeBlockProcessor";
import { createPostProcessor } from "./createPostProcessor";

export const registerBpJsCodeProcessors = (plugin: BetterProperties) => {
	plugin.registerMarkdownPostProcessor(createPostProcessor(plugin));
	plugin.registerMarkdownCodeBlockProcessor(
		...createCodeBlockProcessor(plugin)
	);
	plugin.registerEditorExtension([createInlineCodePlugin(plugin)]);
};
