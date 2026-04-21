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
import { editorInfoField, editorLivePreviewField, TFile } from "obsidian";
import { BetterProperties } from "#/Plugin";
import { initInlineFormulaRenderer } from "./renderer";

/**
 * Creates the CM6 plugin for rendering property links
 */
export const createInlineFormulaRendererPlugin = (plugin: BetterProperties) => {
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
					!(update.docChanged || update.selectionSet || update.viewportChanged)
				)
					return;
				this.decorations = this.buildDecorations(update.view);
			}

			buildDecorations(view: EditorView) {
				this.decorations = Decoration.set([]);
				let widgets: Range<Decoration>[] = [];
				const tree = syntaxTree(view.state);

				// traverse the document and find internal links
				for (const { from, to } of view.visibleRanges)
					tree.iterate({
						from,
						to,
						enter: (node) => {
							const names = node.name.split("_");
							if (!names.includes("inline-code")) {
								return;
							}

							const { inlineFormulaSyntax } = plugin.getSettings();

							const text = view.state.doc.sliceString(node.from, node.to);
							if (!text.startsWith(inlineFormulaSyntax)) return;

							const formula = text.slice(inlineFormulaSyntax.length);
							if (!formula) return;

							const prev = node.node.prevSibling;
							const next = node.node.nextSibling;

							if (!prev || !next) return;

							const containingFile = view.state.field(editorInfoField).file;
							if (!containingFile) return;

							const selOverlap = selectionAndRangeOverlap(
								view.state.selection,
								prev.from,
								next.to
							);

							// selection overlaps with syntax, so remove decoration
							if (selOverlap) {
								this.decorations.between(
									node.from,
									node.to,
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

							let widget = Decoration.replace({
								widget: new InlineFormulaRendererWidget(
									formula,
									plugin,
									containingFile,
									view
								),
							}).range(prev.from, next.to);
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

/**
 * The CM6 widget for handling the rendering of property links
 */
class InlineFormulaRendererWidget extends WidgetType {
	constructor(
		private formula: string,
		private plugin: BetterProperties,
		private containingFile: TFile,
		private view: EditorView
	) {
		super();
	}

	toDOM(): HTMLElement {
		const { plugin, containingFile, formula } = this;

		const containerEl = window.createSpan();

		const renderer = initInlineFormulaRenderer({
			plugin,
			containerEl,
			formula,
			containingFile,
		});

		this.destroy = (dom) => {
			dom.remove();
			plugin.formulaSyncManager.renderers.delete(renderer);
		};

		return containerEl;
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
			// set the cursor after the element so that it doesn't select starting from the last cursor position.
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

	eq(widget: InlineFormulaRendererWidget): boolean {
		return widget.formula === this.formula;
	}
}

/**
 * Check if cursor selection overlaps with a range
 */
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
