import { EmbeddableMarkdownEditor } from "@/classes/EmbeddableMarkdownEditor";
import { CustomTypeWidget } from "..";
import { text } from "@/i18Next";

export const MarkdownWidget: CustomTypeWidget = {
	type: "markdown",
	icon: "m-square",
	default: () => "",
	name: () => text("typeWidgets.markdown.name"),
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, data, ctx) => {
		const container = el.createDiv({
			cls: "metadata-input-longtext better-properties-metadata-property-markdown-div",
		});
		const { value } = data;
		const str = value?.toString() ?? "";
		const emde = new EmbeddableMarkdownEditor(
			plugin.app,
			container,
			{
				value: str,
				onBlur: (editor) => {
					const val = editor.editor?.getValue() ?? "";
					ctx.onChange(val);
				},
			},
			ctx.sourcePath
		);
		ctx.metadataEditor.register(() => emde.destroy());
	},
};
