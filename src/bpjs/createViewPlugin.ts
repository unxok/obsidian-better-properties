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
import { Component, editorInfoField, TFile } from "obsidian";
import BetterProperties from "~/main";
import { BpJsApi } from "./api";

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
		const cmp = new Component();
		this.destroy = (dom) => {
			dom.remove();
			cmp.unload();
		};

		const code = this.codeText.slice(this.plugin.codePrefix.length);
		const api = new BpJsApi(this.plugin, undefined, this.file.path, cmp, code);
		api.run(code);

		const field = this.view.state.field(editorInfoField);
		if (field.editor?.inTableCell) {
			// TODO prevent click from focusing within editor and placing cursor it
			// does not work
			// api.el.addEventListener("click", (e) => {
			// 	e.preventDefault();
			// 	e.stopImmediatePropagation();
			// 	e.stopPropagation();
			// });
		}

		api.el.classList.add("better-properties-bpjs-code");

		return api.el;
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
		// return false;
		// TODO need to check position in doc as well

		return widget.codeText === this.codeText;
	}
}

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
				// if (!update.state.field(editorLivePreviewField)) {
				// 	this.decorations = Decoration.none;
				// 	return;
				// }
				if (
					!(update.docChanged || update.selectionSet || update.viewportChanged)
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
							// console.log("node names: ", names);
							// if (names.includes("HyperMD-header")) {
							// 	console.log("header node: ", node.node);
							// }
							if (
								!names.includes("inline-code") &&
								names.includes("formatting")
							) {
								return;
							}
							// Check for inline code nodes
							let codeText = view.state.doc.sliceString(node.from, node.to);
							// Extract text between the backticks
							const isBP = codeText.startsWith(plugin.codePrefix);
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
									(from, to, _value) => {
										this.decorations = this.decorations.update({
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

							let widget = Decoration.replace({
								widget: new InlineCodeWidget(codeText, plugin, file, view),
								// side: 1,
							}).range(node.from, node.to);
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
		return range.from <= rangeTo && range.to >= rangeFrom;
	}

	return false;
};
