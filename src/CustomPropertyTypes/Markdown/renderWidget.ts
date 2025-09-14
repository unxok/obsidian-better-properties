import { obsidianText } from "~/i18next/obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
// import { EmbeddableMarkdownEditor } from "~/Classes/EmbeddableMarkdownEditor/original";
import { EmbeddableMarkdownEditor } from "~/classes/EmbeddableMarkdownEditor";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new MarkdownTypeComponent(plugin, el, value, ctx);
};

class MarkdownTypeComponent extends PropertyWidgetComponentNew<
	"markdown",
	string
> {
	type = "markdown" as const;
	parseValue = (v: unknown) => v?.toString() ?? "";

	embeddedMarkdownEditor: EmbeddableMarkdownEditor;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const parsed = this.parseValue(value);
		this.embeddedMarkdownEditor = new EmbeddableMarkdownEditor(
			plugin.app,
			el,
			{
				value: parsed,
				onBlur: (editor) => {
					const val = editor.editor?.getValue() ?? "";
					this.setValue(val);
				},
				placeholder: obsidianText("properties.label-no-value"),
			},
			ctx.sourcePath
		);

		this.onFocus = () => {
			this.embeddedMarkdownEditor.focus();
		};
	}

	getValue(): string {
		return this.embeddedMarkdownEditor.editor?.getValue() ?? "";
	}

	setValue(value: unknown): void {
		if (this.embeddedMarkdownEditor.editor?.getValue() !== value) {
			this.embeddedMarkdownEditor.editor?.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}
