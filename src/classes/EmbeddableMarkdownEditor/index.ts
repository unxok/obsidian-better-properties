/**
 * All credits go to mgmeyers for figuring out how to grab the proper editor prototype
 * 	 and making it easily deployable
 * Changes made to the original code:
 * 	 - Refactored to JS-only syntax (original code made use of React)
 * 	 - Added blur completion
 * 	 - Added some comments on how the code functions
 * 	 - Made editor settings fully optional
 * 	 - Allow all editor commands to function on this editor
 * 	 - Added typings for the editor(s) (will be added to obsidian-typings)
 * Make sure to also check out the original source code here: https://github.com/mgmeyers/obsidian-kanban/blob/main/src/components/Editor/MarkdownEditor.tsx
 * @author Fevol
 * @url https://gist.github.com/Fevol/caa478ce303e69eabede7b12b2323838
 */

/**
 * Fevol's Implementation is licensed under MIT, as is this project.
 * Changes made to the original code:
 * - Removed check for now-fixed chrome bug for onBlur()
 * - Added some typescript assertions for editor being existent (ts error if not asserted)
 * - Removed monkey patch for setActiveLeaf() as it caused a bug with a leaf's editor permanently stealing workspace.activeEditor
 * - Add `filePath` param to constructor. Without it, rendering links (and possibly other things) breaks and causes issues.
 *
 * - @author Unxok
 */

import { App, Constructor, Scope, TFile } from "obsidian";
import { MarkdownScrollableEditView, WidgetEditorView } from "obsidian-typings";
import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder, ViewUpdate } from "@codemirror/view";

function resolveEditorPrototype(app: App) {
	// Create a temporary editor to resolve the prototype of ScrollableMarkdownEditor
	const widgetEditorView = app.embedRegistry.embedByExtension.md(
		{ app, containerEl: document.createElement("div") },
		null as unknown as TFile,
		""
	) as WidgetEditorView;

	// Mark as editable to instantiate the editor
	widgetEditorView.editable = true;
	widgetEditorView.showEditor();
	const MarkdownEditor = Object.getPrototypeOf(
		Object.getPrototypeOf(widgetEditorView.editMode!)
	);

	// Unload to remove the temporary editor
	widgetEditorView.unload();

	return MarkdownEditor.constructor as Constructor<MarkdownScrollableEditView>;
}

interface MarkdownEditorProps {
	cursorLocation: { anchor: number; head: number };
	value: string;
	cls: string;
	placeholder: string;
	focus: boolean;

	filteredExtensions: Extension[];

	onEditorClick: (
		event: MouseEvent,
		editor: EmbeddableMarkdownEditor,
		element?: HTMLElement
	) => void;
	onEnter: (
		editor: EmbeddableMarkdownEditor,
		mod: boolean,
		shift: boolean
	) => boolean;
	onEscape: (editor: EmbeddableMarkdownEditor) => void;
	onSubmit: (editor: EmbeddableMarkdownEditor) => void;
	onFocus: (editor: EmbeddableMarkdownEditor) => void;
	onBlur: (editor: EmbeddableMarkdownEditor) => void | Promise<void>;
	onPaste: (e: ClipboardEvent, editor: EmbeddableMarkdownEditor) => void;
	onChange: (update: ViewUpdate, editor: EmbeddableMarkdownEditor) => void;
}

const defaultProperties: MarkdownEditorProps = {
	cursorLocation: { anchor: 0, head: 0 },
	value: "",
	cls: "",
	placeholder: "",
	focus: true,
	filteredExtensions: [],

	onEditorClick: () => {},
	onEnter: (editor, mod, _) => {
		editor.options.onSubmit(editor);
		return mod;
	},
	onEscape: (editor) => {
		editor.options.onBlur(editor);
	},
	onSubmit: () => {},
	// NOTE: Blur takes precedence over Escape (this can be changed)
	onBlur: (editor) => {
		editor.options.onBlur(editor);
	},
	onFocus: () => {},
	onPaste: () => {},
	onChange: () => {},
};

export class EmbeddableMarkdownEditor
	extends resolveEditorPrototype(app)
	implements MarkdownScrollableEditView
{
	options: MarkdownEditorProps;
	initial_value: string;
	scope: Scope;
	//
	setActiveLeafCalls: number = 0;

	/**
	 * Construct the editor
	 * @remark Takes 5ms to fully construct and attach
	 * @param app - Reference to App instance
	 * @param container - Container element to add the editor to
	 * @param options - Options for controling the initial state of the editor
	 */
	constructor(
		app: App,
		container: HTMLElement,
		options: Partial<MarkdownEditorProps>,
		filePath: string
	) {
		super(app, container, {
			app,
			// This mocks the MarkdownView functions, which is required for proper functioning of scrolling
			onMarkdownScroll: () => {},
			getMode: () => "source",
		});
		this.options = { ...defaultProperties, ...options };
		this.initial_value = this.options.value!;
		this.scope = new Scope(this.app.scope);
		// NOTE: Custom keys can be added to the scope to override default behaviour,
		//		 remember to return true to also prevent the default behaviour from executing

		// NOTE: Since Mod+Enter is linked to the "Open link in new leaf" command, but it is also the default user action for submitting the editor,
		//      the hotkey should be disabled by either overwriting it in the scope, or applying a preventDefault in the keymap
		//      the scope is used to prevent the hotkey from executing (by returning `true`)
		// TODO: It is also possible to allow both behaviours to coexist:
		//     1) Fetch the command via hotkeyManager
		//     2) Execute the command callback
		//     3) Return the result of the callback (callback returns false if callback could not execute)
		//     		(In this case, if cursor is not on a link token, the callback will return false, and onEnter will be applied)
		this.scope.register(["Mod"], "Enter", () => {
			return true;
		});

		// Since the commands expect that this is a MarkdownView (with editMode as the Editor itself),
		//   we need to mock this by setting both the editMode and editor to this instance and its containing view respectively
		// @ts-expect-error (editMode is normally a MarkdownSubView)
		this.owner.editMode = this;
		this.owner.editor = this.editor;

		const f = this.app.vault.getFileByPath(filePath ?? "");
		// @ts-expect-error read-only property. This is needed because otherwise `file` is undefined and rendering links breaks.
		this.owner.file = f;

		this.set(options.value || "", true);

		// Execute onBlur when the editor loses focus
		if (this.options.onBlur !== defaultProperties.onBlur) {
			this.editor!.cm.contentDOM.addEventListener("blur", () => {
				this.options.onBlur(this);
			});
		}

		// Whenever the editor is focused, set the activeEditor to the mocked view (this.owner)
		// This allows for the editorCommands to actually work
		this.editor!.cm.contentDOM.addEventListener("focusin", () => {
			this.app.keymap.pushScope(this.scope);
			this.app.workspace.activeEditor = this.owner;
			if (this.options.onFocus === defaultProperties.onFocus) return;
			this.options.onFocus(this);
		});

		this.editorEl.classList.remove("markdown-source-view");

		if (options.cls) this.editorEl.classList.add(options.cls);
		if (options.cursorLocation) {
			this.editor!.cm.dispatch({
				selection: EditorSelection.range(
					options.cursorLocation.anchor,
					options.cursorLocation.head
				),
			});
		}
	}

	onUpdate(update: ViewUpdate, changed: boolean) {
		super.onUpdate(update, changed);
		if (changed) this.options.onChange(update, this);
	}

	onEditorClick(event: MouseEvent, element?: HTMLElement): void {
		super.onEditorClick(event, element);
		this.options.onEditorClick(event, this, element);
	}

	/**
	 * Constructs local (always active) extensions for the editor
	 * @remark Other plugins will not be able to send direct updates to these extensions to change configurations
	 * @tutorial getDynamicExtensions is used to add extensions that should be dynamically updated
	 */
	buildLocalExtensions(): Extension[] {
		const extensions = super.buildLocalExtensions();
		if (this.options.placeholder)
			extensions.push(placeholder(this.options.placeholder));

		/* Editor extension for handling specific user inputs */
		extensions.push(
			EditorView.domEventHandlers({
				paste: (event) => {
					this.options.onPaste(event, this);
				},
			})
		);

		extensions.push(
			Prec.highest(
				keymap.of([
					{
						key: "Enter",
						run: () => this.options.onEnter(this, false, false),
						shift: () => this.options.onEnter(this, false, true),
					},
					{
						key: "Mod-Enter",
						run: () => this.options.onEnter(this, true, false),
						shift: () => this.options.onEnter(this, true, true),
					},
					{
						key: "Escape",
						run: () => {
							this.options.onEscape(this);
							return true;
						},
						preventDefault: true,
					},
				])
			)
		);

		/* Additional Editor extensions (renderers, ...) */

		return extensions;
	}

	getDynamicExtensions(): Extension[] {
		return super
			.getDynamicExtensions()
			.filter((ext) => !this.options.filteredExtensions.includes(ext));
	}

	/**
	 * Force no padding on the bottom of the editor
	 */
	updateBottomPadding(_: number) {
		return 0;
	}

	/**
	 * Ensure that the editor is properly destroyed when the view is closed
	 */
	destroy(): void {
		if (this._loaded) this.unload();
		this.app.keymap.popScope(this.scope);
		if (this.app.workspace.activeEditor === this.owner)
			this.app.workspace.activeEditor = null;
		this.containerEl.empty();
		super.destroy();
	}

	/**
	 * When removing as a component, destroy will also get invoked
	 */
	onunload() {
		super.onunload();
		this.destroy();
	}

	/**
	 * When finished loading, take focus
	 */
	onload() {
		super.onload();
		if (this.options.focus) this.editor!.focus();
	}
}
