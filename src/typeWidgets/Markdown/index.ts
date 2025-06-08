import { EmbeddableMarkdownEditor } from "@/classes/EmbeddableMarkdownEditor";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { text } from "@/i18Next";
import { CreatePropertySettings } from "@/PropertySettings";

const typeKey: CustomTypeWidget["type"] = "markdown";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "m-square",
	default: () => "",
	name: () => text("typeWidgets.markdown.name"),
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, value, ctx) => {
		const container = el.createDiv({
			cls: "metadata-input-longtext better-properties-metadata-property-markdown-div",
		});
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

const createSettings: CreatePropertySettings<typeof typeKey> = (el) => {
	el.createDiv({ text: "Nothing to see here... yet!" });
};

export const Markdown: WidgetAndSettings = [widget, createSettings];
