import { ColorComponent, ToggleComponent } from "obsidian";
import {
	PropertyEntryData,
	PropertyRenderContext,
	PropertyWidget,
} from "obsidian-typings";
import { EmbeddableMarkdownEditor } from "@/classes/EmbeddableMarkdownEditor";
import { typeKeySuffixes, typeWidgetPrefix } from "@/libs/constants";
import PropertiesPlusPlus from "@/main";

const shortTypeKey = typeKeySuffixes.markdown;
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = () => "Markdown";
const icon = "m-square";
const defaultValue = () => "";
const validate = (v: unknown) => typeof v?.toString() === "string";
const render = (
	plugin: PropertiesPlusPlus,
	el: HTMLElement,
	data: PropertyEntryData<unknown>,
	ctx: PropertyRenderContext
) => {
	const container = el.createDiv({
		cls: "metadata-input-longtext properties-plus-plus-metadata-property-markdown-div",
	});
	// const container = parentContainer.createDiv({
	// 	cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
	// });
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
			onEnter: (editor, _, shift) => {
				if (!shift) {
					// editor.editorEl.blur();
					return false;
				}
				console.log("we out here");
				editor.editor?.newlineAndIndentOnly();
				return true;
			},
		},
		ctx.sourcePath
	);

	// container.addEventListener("click", () => emde.focus());

	ctx.metadataEditor.register(() => emde.destroy());
};

export const registerMarkdown = (plugin: PropertiesPlusPlus) => {
	plugin.app.metadataTypeManager.registeredTypeWidgets[fullTypeKey] = {
		default: defaultValue,
		type: fullTypeKey,
		name,
		icon,
		validate,
		render: (...params) => render(plugin, ...params),
	};
};
