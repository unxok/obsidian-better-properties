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
	Component,
	editorInfoField,
	editorLivePreviewField,
	TFile,
} from "obsidian";
import { BetterProperties } from "#/Plugin";
import { initPropertyLinkRender } from "./renderer";

/**
 * The CM6 widget for handling the rendering of property links
 */
class PropertyLinkRendererWidget extends WidgetType {
	constructor(
		private property: string,
		private plugin: BetterProperties,
		private file: TFile,
		private view: EditorView
	) {
		super();
	}

	toDOM(): HTMLElement {
		const { plugin, file, property } = this;
		const component = new Component();
		this.destroy = (dom) => {
			dom.remove();
			component.unload();
		};

		const containerEl = window.createSpan({
			cls: "better-properties--property-link-container",
		});

		initPropertyLinkRender({
			plugin,
			file,
			component,
			containerEl,
			property,
			hideKey: false,
		});
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

	eq(widget: PropertyLinkRendererWidget): boolean {
		return widget.property === this.property;
	}
}

/**
 * Creates the CM6 plugin for rendering property links
 */
export const createPropertyLinkRendererPlugin = (plugin: BetterProperties) => {
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
							if (!names.includes("hmd-internal-link")) {
								return;
							}

							let text = view.state.doc.sliceString(node.from, node.to);
							const containingFile = view.state.field(editorInfoField).file;
							if (!containingFile) return;

							const parsed = plugin.propertyLinkManager.parsePropertyLink(
								text,
								containingFile
							);
							if (!parsed?.property) return;

							// offest range by 2 to account fro opening and closing brackets
							const selOverlap = selectionAndRangeOverlap(
								view.state.selection,
								node.from - 2,
								node.to + 2
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

							const prev = node.node.prevSibling;
							const next = node.node.nextSibling;

							if (!prev || !next) {
								throw new Error("Previous and Next sibling must be defined");
							}

							let widget = Decoration.replace({
								widget: new PropertyLinkRendererWidget(
									parsed.property,
									plugin,
									parsed.file,
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
