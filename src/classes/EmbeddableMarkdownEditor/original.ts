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
 */

import {
	App,
	Constructor,
	Keymap,
	Scope,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { MarkdownScrollableEditView, WidgetEditorView } from "obsidian-typings";

import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder, ViewUpdate } from "@codemirror/view";

import { around } from "monkey-around";

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
	cursorLocation?: { anchor: number; head: number };
	value?: string;
	cls?: string;
	placeholder?: string;

	onEnter: (
		editor: EmbeddableMarkdownEditor,
		mod: boolean,
		shift: boolean
	) => boolean;
	onEscape: (editor: EmbeddableMarkdownEditor) => void;
	onSubmit: (editor: EmbeddableMarkdownEditor) => void;
	onBlur: (editor: EmbeddableMarkdownEditor) => void;
	onFocus: (editor: EmbeddableMarkdownEditor) => void;
	onPaste: (e: ClipboardEvent, editor: EmbeddableMarkdownEditor) => void;
	onChange: (update: ViewUpdate) => void;
}

const defaultProperties: MarkdownEditorProps = {
	cursorLocation: { anchor: 0, head: 0 },
	value: "",
	cls: "",
	placeholder: "",

	onEnter: () => false,
	onEscape: () => {},
	onSubmit: () => {},
	// NOTE: Blur takes precedence over Escape (this can be changed)
	onBlur: () => {},
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
		sourcePath: string
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
		// NOTE: Hotkeys take precedence over CM keymap, so scope is introduced to allow for specific hotkeys to be overwritten
		//   In this case, since Mod+Enter is linked to the "Open link in new leaf" command, but it is also the default user action for submitting the editor,
		//      the scope is used to prevent the hotkey from executing (by returning `true`)
		// TODO: It is also possible to allow both behaviours to coexist:
		//     1) Fetch the command via hotkeyManager
		//     2) Execute the command callback
		//     3) Return the result of the callback (callback returns false if callback could not execute)
		//     		(In this case, if cursor is not on a link token, the callback will return false, and onEnter will be applied)
		this.scope.register(["Mod"], "Enter", (e, ctx) => {
			return true;
		});

		// Since the commands expect that this is a MarkdownView (with editMode as the Editor itself),
		//   we need to mock this by setting both the editMode and editor to this instance and its containing view respectively
		// @ts-expect-error (editMode is normally a MarkdownSubView)
		this.owner.editMode = this;
		this.owner.editor = this.editor;

		//
		const file = app.vault.getFileByPath(sourcePath);
		if (!file) {
			throw new Error("No file found at: " + sourcePath);
		}
		// @ts-expect-error read-only property
		this.owner.file = file;

		this.set(options.value || "", true);
		this.register(
			around(this.app.workspace, {
				// @ts-expect-error (Incorrectly matches the deprecated setActiveLeaf method)
				setActiveLeaf:
					(
						oldMethod: (
							leaf: WorkspaceLeaf,
							params?: { focus?: boolean }
						) => void
					) =>
					(leaf: WorkspaceLeaf, params: { focus?: boolean }) => {
						// If the editor is currently focused, prevent the workspace setting the focus to a workspaceLeaf instead
						if (!this.activeCM.hasFocus)
							oldMethod.call(this.app.workspace, leaf, params);
					},
			})
		);

		// Execute onBlur when the editor loses focus
		// NOTE: Apparently Chrome does a weird thing where removing an element from the DOM triggers a blur event
		//		 (Hence why the ._loaded check is necessary)
		if (this.options.onBlur !== defaultProperties.onBlur) {
			this.editor!.cm.contentDOM.addEventListener("blur", () => {
				this.app.keymap.popScope(this.scope);
				if (this._loaded) this.options.onBlur(this);
			});
		}

		// Whenever the editor is focused, set the activeEditor to the mocked view (this.owner)
		// This allows for the editorCommands to actually work
		this.editor!.cm.contentDOM.addEventListener("focusin", (e) => {
			this.app.keymap.pushScope(this.scope);
			this.app.workspace.activeEditor = this.owner;
			this.options.onFocus(this);
		});

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

	get value() {
		return this.editor!.cm.state.doc.toString();
	}

	// @ts-expect-error IDEK
	onUpdate(update: ViewUpdate, changed: boolean) {
		// @ts-expect-error IDEK
		super.onUpdate(update, changed);
		if (changed) this.options.onChange(update);
	}

	/**
	 * Loads the CM extensions for rendering Markdown and handling user inputs
	 * Note that other plugins will not be able to send updates to these extensions to change configurations
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
						run: (cm) => this.options.onEnter(this, false, false),
						shift: (cm) => this.options.onEnter(this, false, true),
					},
					{
						key: "Mod-Enter",
						run: (cm) => this.options.onEnter(this, true, false),
						shift: (cm) => this.options.onEnter(this, true, true),
					},
					{
						key: "Escape",
						run: (cm) => {
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

	/**
	 * Ensure that the editor is properly destroyed when the view is closed
	 */
	destroy(): void {
		if (this._loaded) this.unload();
		this.app.keymap.popScope(this.scope);
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
}
