import {
	Decoration,
	EditorView,
	ViewPlugin,
	WidgetType,
	ViewUpdate,
	DecorationSet,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorSelection, Range } from "@codemirror/state";
import {
	editorInfoField,
	editorLivePreviewField,
	MarkdownRenderChild,
	TFile,
} from "obsidian";
import { tryParseJson } from "@/libs/utils/pure";
import { tryParseYaml } from "@/libs/utils/obsidian";
import BetterProperties from "@/main";
import {
	renderPropertyTypeWidget,
	renderYamlParseError,
	renderZodParseError,
	PropertyCodeBlockSchema,
} from "@/PropertyRenderer";

// TODO make this configurable
export const codePrefix = "&=";

// Define a widget to replace the inline code block
class InlineCodeWidget extends WidgetType {
	constructor(
		private codeText: string,
		private plugin: BetterProperties,
		private file: TFile,
		private view: EditorView
	) {
		super();
	}

	toDOM(): HTMLElement {
		const el = document.createElement("span");
		el.classList.add("better-properties-inline-property-widget");
		const jsonStr = "[" + this.codeText.slice(codePrefix.length) + "]";
		const result = tryParseYaml(jsonStr);
		if (!result.success) {
			const msg =
				result.error instanceof Error
					? result.error.message
					: "unknown error";
			renderYamlParseError(el, msg);
			return el;
		}

		const transformed = tryTransformData(result.data);
		if (!transformed) {
			const msg = "Expected array, received something else.";
			renderYamlParseError(el, msg);
			return el;
		}

		const parsed = PropertyCodeBlockSchema.safeParse(transformed);
		if (!parsed.success) {
			renderZodParseError(el, parsed.error);
			return el;
		}

		const mdrc = new MarkdownRenderChild(el);
		this.destroy = function (dom) {
			dom.remove();
			mdrc.unload();
		};

		renderPropertyTypeWidget(
			el,
			parsed.data,
			this.plugin,
			this.file.path,
			mdrc
		);

		console.log("el: ", el);
		return el;
	}

	ignoreEvent(event: MouseEvent | Event): boolean {
		// instanceof check does not work in pop-out windows, so check it like this
		if (event.type !== "mousedown") return true;
		const e = event as MouseEvent;
		const currentPos = this.view.posAtCoords({
			x: e.x,
			y: e.y,
		});
		if (e.shiftKey) {
			// Set the cursor after the element so that it doesn't select starting from the last cursor position.
			if (currentPos) {
				const { editor } = this.view.state.field(editorInfoField);
				if (editor) {
					editor.setCursor(editor.offsetToPos(currentPos));
				}
			}
			return false;
		}

		return true;
	}

	eq(widget: InlineCodeWidget): boolean {
		return widget.codeText === this.codeText;
	}
}

// Create the view plugin that will decorate the inline code blocks

export const createInlineCodePlugin = (plugin: BetterProperties) => {
	const inlineCodePlugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			view: EditorView;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
				this.view = view;
			}

			update(update: ViewUpdate) {
				if (!update.state.field(editorLivePreviewField)) {
					this.decorations = Decoration.none;
					return;
				}
				if (
					!(
						update.docChanged ||
						update.selectionSet ||
						update.viewportChanged
					)
				)
					return;
				this.decorations = this.buildDecorations(update.view);
			}

			buildDecorations(view: EditorView) {
				this.decorations = Decoration.set([]);
				let widgets: Range<Decoration>[] = [];
				const tree = syntaxTree(view.state);

				// Traverse the document and find all inline code blocks (using the "`" symbols)
				for (const { from, to } of view.visibleRanges)
					tree.iterate({
						from,
						to,
						enter: (node) => {
							const names = node.name.split("_");
							if (
								!names.includes("inline-code") &&
								names.includes("formatting")
							)
								return;
							// Check for inline code nodes
							let codeText = view.state.doc.sliceString(
								node.from,
								node.to
							); // Extract text between the backticks
							const isBP = codeText.startsWith(codePrefix);
							const selOverlap = selectionAndRangeOverlap(
								view.state.selection,
								node.from - 1,
								node.to + 1
							);

							if (selOverlap && isBP) {
								// selection overlaps with inline code, so remove decoration
								this.decorations.between(
									node.from - 1,
									node.to + 1,
									(from, to, value) => {
										this.decorations =
											this.decorations.update({
												filterFrom: from,
												filterTo: to,
												filter: () => false,
											});
									}
								);
								return;
							}

							// Not better-properties inline-code, so do nothing
							if (!isBP) return;

							const file = view.state.field(editorInfoField).file;
							if (!file) return;

							console.log("got node: ", node);

							let widget = Decoration.replace({
								widget: new InlineCodeWidget(
									codeText,
									plugin,
									file,
									view
								),
								side: 1,
							}).range(node.from - 1, node.to + 1);
							widgets.push(widget);
						},
					});

				return Decoration.set(widgets);
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
	return inlineCodePlugin;
};

// Finally, add the plugin to your CodeMirror instance
// export const inlineCodeExtension = [createInlineCodePlugin];

const selectionAndRangeOverlap = (
	selection: EditorSelection,
	rangeFrom: number,
	rangeTo: number
) => {
	for (const range of selection.ranges) {
		if (range.from <= rangeTo && range.to >= rangeFrom) {
			return true;
		}
	}

	return false;
};

const tryTransformData = (data: unknown) => {
	if (!Array.isArray(data)) return null;
	const rec: Record<string, string> = {};
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		if (typeof v !== "object") return null;
		const keys = Object.keys(v);
		if (keys.length === 0 || keys.length > 1) return null;
		const key = keys[0];
		const value = v[key]?.toString();
		if (typeof value !== "string") return null;
		rec[key] = value;
	}
	return rec;
};
