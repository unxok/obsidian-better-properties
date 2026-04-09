import { App, TFile, Modal, RenderContext } from "obsidian";
import {
	BasesContext,
	BasesController as BasesControllerBase,
	BasesLocal,
	BasesMockContext,
	BasesQuery,
	EmbedComponent,
	EmbedContext,
} from "obsidian-typings";

interface BasesController extends Omit<BasesControllerBase, "results"> {
	results: BasesControllerResults;
	view: {
		config: {
			order: string[];
		};
		updateVirtualDisplay(): void;
	};
	updateSearchQuery(query: BasesQuery): void;
}

interface EmbedBaseComponent extends EmbedComponent {
	controller: BasesController;
	containingFile: TFile | null;
	containerEl: HTMLElement;
	loadFile(): void;
}

// interface BasesFormulaValue {
// 	icon: string;
// 	data?: unknown;
// 	file?: TFile;
// 	constructor: {
// 		type: "List" | "Object" | "String" | "Number" | "Boolean" | "Null";
// 	};

// 	renderTo(containerEl: HTMLElement, renderContext: RenderContext): void;
// }

type BasesFormulaValue =
	| BasesFormulaValueList
	| BasesFormulaValueObject
	| BasesFormulaValueString
	| BasesFormulaValueNumber
	| BasesFormulaValueBoolean
	| BasesFormulaValueNull
	| BasesFormulaValueLink
	| BasesFormulaValueFile;

// TODO finish typing this
interface BasesFormulaValueBase<Type extends string, Data> {
	constructor: {
		type: Type;
	};

	data: Data;

	equals(BasesFormulaValueBase): unknown;
	keys(): unknown;
	looseEquals(): unknown;
	objectAccess(): unknown;
	renderTo(containerEl: HTMLElement, renderContext: RenderContext): void;
}

// TODO finish typing this
interface BasesFormulaValueList
	extends BasesFormulaValueBase<"List", BasesFormulaValue[]> {}

// TODO finish typing this
interface BasesFormulaValueObject
	extends BasesFormulaValueBase<"Object", Record<string, unknown>> {}

// TODO finish typing this
interface BasesFormulaValueString
	extends BasesFormulaValueBase<"String", string> {}

// TODO finish typing this
interface BasesFormulaValueNumber
	extends BasesFormulaValueBase<"Number", number> {}

// TODO finish typing this
interface BasesFormulaValueBoolean
	extends BasesFormulaValueBase<"Boolean", boolean> {}

// TODO finish typing this
interface BasesFormulaValueNull
	extends BasesFormulaValueBase<"Null", undefined> {}

// TODO finish typing this
interface BasesFormulaValueLink extends BasesFormulaValueBase<"Link", string> {
	display: BasesFormulaValueString;
}

interface BasesFormulaValueFile
	extends BasesFormulaValueBase<"File", undefined> {
	file: TFile;
}

// TODO open PR to obsidian-typings
declare module "obsidian-typings" {
	interface EmbedRegistryEmbedByExtensionRecord {
		base: (
			context: EmbedContext,
			file: TFile,
			viewName?: string
		) => EmbedBaseComponent;
	}

	interface BasesFormula {
		formula: {
			type: string;
			value: string;
		};
		text: string;
		getValue(ctx: BasesLocal): BasesFormulaValue;
	}

	interface BasesPropertyMenu {
		updateFormula(name: string, formula: BasesFormula): void;
	}

	interface BasesQuery {
		toString(): string;
	}

	interface BasesContext {
		formulas: Record<string, BasesFormula>;
		local: BasesLocal;
		regenerateLocal(): BasesLocal;
	}

	interface BasesLocal {
		app: App;
		file: TFile;
		frontmatter: Record<string, unknown>;
		note: BasesControllerResultsValueNote;

		getRawProperty(property: string): unknown;
		getValue(identifier: string): unknown;
		ctx: BasesContext;
	}
}

declare module "obsidian" {
	interface SettingGroup {
		components: unknown[];
		controlEl: HTMLElement;
		headerEl: HTMLElement;
		headerInnerEl: HTMLElement;
		listEl: HTMLElement;
		searchContainerEl: HTMLElement | undefined;
	}
}

// TODO open PR to obsidian-typings
export type BasesControllerResults = Map<TFile, BasesLocal>;

export interface BasesControllerResultsValueNote {
	data: Record<string, unknown>;
	icon: string;
	lazyEvaluator: (...e: unknown[]) => unknown;

	equals(e: unknown): unknown;
	get(property: string): unknown;
	getInsensitive(e: unknown): unknown;
	isEmpty(): unknown;
	isTruthy(): unknown;
	keys(): unknown;
	objectAccess(e: unknown): unknown;
	valuesRaw(): unknown;
}

declare module "obsidian" {
	interface AbstractInputSuggest<T> {
		// TODO open PR to obsidian-typings. Currently have to manually enter this in package
		showSuggestions: (suggestions: T[]) => void;
	}

	interface SettingTab {
		// TODO open PR to obsidian-typings. Currently have to manually enter this in package
		setting: Modal;
	}
}

declare module "obsidian-typings" {
	// TODO open PR to obsidian-typings. Currently have to manually enter this in package
	interface PromisedQueue {
		queue: {
			promise: {
				promise: Promise<unknown>;
				resolve: () => unknown;
				reject: () => unknown;
			};
			runnable: {
				running: boolean;
				cancelled: boolean;
				onStart: () => unknown;
				onStop: () => unknown;
				onCancel: () => unknown;
			};
		};
	}
}
