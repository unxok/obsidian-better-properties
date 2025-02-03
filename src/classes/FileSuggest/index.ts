// TRANSLATIONS done
import {
	AbstractInputSuggest,
	TextComponent,
	SearchComponent,
	App,
	EditorSuggestContext,
	EditorPosition,
	Editor,
	TFile,
	EditorSuggestTriggerInfo,
	EditorSuggest,
	Scope,
} from "obsidian";
import { FileSuggestManager } from "obsidian-typings";

type BaseWikilinkSuggestion = {
	/**
	 * Usually the path to the file, header, or section
	 * @remark If link is to non-existent file, this will be the link text
	 * @remark Typically, only non-markdown files will include the file extension here
	 */
	path: string | null;
	/**
	 * Each item in the array contains indexes of characters for sections in the `path` that match the search value
	 */
	matches: [matchStart: number, matchEnd: number][] | null;
	/**
	 * How accurate of a search this result is
	 * @remark Typically this is a float with 4 digits after the decimal
	 */
	score: number;
};

type FileWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "file";
	/**
	 * The corresponding file for this suggestion
	 */
	file: TFile;
	/**
	 * I assume this indicates if this file is part of the configured "Excluded files" setting
	 */
	downranked: boolean;
};

type LinkTextWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "linktext";
};

export type HeadingWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "heading";
	/**
	 * The corresponding file for this suggestion
	 */
	file: TFile;
	/**
	 * The text of this heading
	 * @remark Does not include the "#" symbols that are part of MD syntax
	 */
	heading: string;
	/**
	 * The 1 based index of the type of heading this is.
	 * @example <h2 /> → 2
	 */
	level: number;
	/**
	 * The ending section of the link to this header. Starts at and includes the "#" to the end of the heading text
	 */
	subpath: string;
};

type Position = { line: number; column: number; offset: number };

export type BlockWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "block";
	display: string;
	content: string;
	idMatch: string | null;
	node: {
		children: {
			position: Position;
			type: string;
			value: string;
		}[];
		depth: number;
		position: {
			start: Position;
			end: Position;
			index: unknown[];
		};
	};
	data: Record<string, any>;
};

type WikilinkSuggestion =
	| FileWikilinkSuggestion
	| LinkTextWikilinkSuggestion
	| HeadingWikilinkSuggestion
	| BlockWikilinkSuggestion;

export const resolveWikilinkSuggestPrototype = (app: App) => {
	const { editorSuggest } = app.workspace;
	const wikilinkSuggest = editorSuggest.suggests[0];
	return wikilinkSuggest as FileEditorSuggest;
};

export interface FileEditorSuggest extends EditorSuggest<WikilinkSuggestion> {
	app: App;
	context: {
		editor: Editor;
		end: { line: number; ch: number };
		file: TFile;
		query: string;
		start: { line: number; ch: number };
	} | null;
	instructionsEl: HTMLElement;
	isOpen: boolean;
	limit: number;
	score: Scope;
	suggestEl: HTMLElement;
	/**
	 * Manages fetching of suggestions from metadatacache
	 */
	suggestManager: FileSuggestManager;
	constructor(app: App): FileEditorSuggest;
}

export class FileSuggest extends AbstractInputSuggest<WikilinkSuggestion> {
	component: TextComponent | SearchComponent;
	suggestManager: FileSuggestManager;
	instructionsEl: HTMLElement;
	setInstructions: FileEditorSuggest["setInstructions"];
	context: FileEditorSuggest["context"] = null;

	constructor(app: App, component: TextComponent | SearchComponent) {
		super(app, component.inputEl);
		this.component = component;

		const proto = resolveWikilinkSuggestPrototype(app);
		this.onTrigger = proto.onTrigger;
		this.getSuggestions = (query) =>
			proto.getSuggestions({ query } as EditorSuggestContext);
		this.renderSuggestion = proto.renderSuggestion;
		// this.selectSuggestion = proto.selectSuggestion;
		this.suggestManager = proto.suggestManager;
		this.instructionsEl = proto.instructionsEl;
		this.setInstructions = proto.setInstructions;
		this.context = proto.context;
	}

	onTrigger(
		_cursor: EditorPosition,
		_editor: Editor,
		_file: TFile | null
	): EditorSuggestTriggerInfo | null {
		return null;
	}

	protected getSuggestions(
		_query: string
	): WikilinkSuggestion[] | Promise<WikilinkSuggestion[]> {
		return [];
	}

	renderSuggestion(_value: WikilinkSuggestion, _el: HTMLElement): void {}
	selectSuggestion(
		value: WikilinkSuggestion,
		_evt: MouseEvent | KeyboardEvent
	): void {
		this.component.setValue(value.path ?? "");
		this.component.onChanged();
	}
}
