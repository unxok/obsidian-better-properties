import { MarkdownView } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyValueComponent,
} from "../utils";
// import { EmbeddableMarkdownEditor } from "~/Classes/EmbeddableMarkdownEditor/original";
import { EmbeddableMarkdownEditor } from "~/Classes/EmbeddableMarkdownEditor";

export const renderWidget: CustomPropertyType<string>["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	// const settings = getPropertyTypeSettings({
	// 	plugin,
	// 	property: ctx.key,
	// 	type: "toggle",
	// });

	const value = initialValue ?? "";

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-markdown metadata-input-longtext",
	});

	const emde = new EmbeddableMarkdownEditor(
		plugin.app,
		container,
		{
			value,
			onBlur: (editor) => {
				const val = editor.editor?.getValue() ?? "";
				ctx.onChange(val);
			},
			placeholder: "Empty",
		},
		ctx.sourcePath
	);

	const cmp = new PropertyValueComponent(
		container,
		(v) => {
			emde.set(v?.toString() ?? "", true);
		},
		() => {
			emde.focus();
		}
	);

	window.setTimeout(() => {
		plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			if (!leaf.containerEl.contains(el)) return;
			leaf.view.metadataEditor.register(() => {
				emde.destroy();
			});
		});
	}, 0);

	return cmp;
};
