import { DateTime } from "luxon/src/datetime";

export type DataviewSettings = {
	renderNullAs: string;
	taskCompletionTracking: boolean;
	taskCompletionUseEmojiShorthand: boolean;
	taskCompletionText: string;
	taskCompletionDateFormat: string;
	recursiveSubTaskCompletion: boolean;
	warnOnEmptyResult: boolean;
	refreshEnabled: boolean;
	refreshInterval: number;
	defaultDateFormat: string;
	defaultDateTimeFormat: string;
	maxRecursiveRenderDepth: number;
	tableIdColumnName: string;
	tableGroupColumnName: string;
	showResultCount: boolean;
	allowHtml: boolean;
	inlineQueryPrefix: string;
	inlineJsQueryPrefix: string;
	inlineQueriesInCodeblocks: boolean;
	enableInlineDataview: boolean;
	enableDataviewJs: boolean;
	enableInlineDataviewJs: boolean;
	prettyRenderInlineFields: boolean;
	prettyRenderInlineFieldsInLivePreview: boolean;
	dataviewJsKeyword: string;
};

export type DataviewLink = {
	/** The file path this link points to. */
	path: string;
	/** The display name associated with the link. */
	display?: string;
	/** The block ID or header this link points to within a file, if relevant. */
	subpath?: string;
	/** Is this link an embedded link (!)? */
	embed: boolean;
	/** The type of this link, which determines what 'subpath' refers to, if anything. */
	type: "file" | "header" | "block";
	/** Create a link to a specific file. */
	file: (path: string, embed?: boolean, display?: string) => DataviewLink;
	/** Infer link type based on path. */
	infer: (linkpath: string, embed?: boolean, display?: string) => DataviewLink;
	/** Create a link to a specific file and header in that file. */
	header: (
		path: string,
		header: string,
		embed?: boolean,
		display?: string
	) => DataviewLink;
	/** Create a link to a specific file and block in that file. */
	block: (
		path: string,
		blockId: string,
		embed?: boolean,
		display?: string
	) => DataviewLink;
	/** Create a link from an object. */
	fromObject: (object: Record<string, any>) => DataviewLink;
	/** Checks for link equality (i.e., that the links are pointing to the same exact location). */
	equals: (other: DataviewLink) => boolean;
	/** Convert this link to its markdown representation. */
	toString: () => string;
	/** Convert this link to a raw object which is serialization-friendly. */
	toObject: () => Record<string, any>;
	/** Update this link with a new path. */
	withPath: (path: string) => DataviewLink;
	/** Return a new link which points to the same location but with a new display value. */
	withDisplay: (display?: string) => DataviewLink;
	/** Convert a file link into a link to a specific header. */
	withHeader: (header: string) => DataviewLink;
	/** Convert any link into a link to its file. */
	toFile: () => DataviewLink;
	/** Convert this link into an embedded link. */
	toEmbed: () => DataviewLink;
	/** Convert this link into a non-embedded link. */
	fromEmbed: () => DataviewLink;
	/** Convert this link to markdown so it can be rendered. */
	markdown: () => string;
	/** Convert the inner part of the link to something that Obsidian can open / understand. */
	obsidianLink: () => string;
	/** The stripped name of the file this link points to. */
	fileName: () => string;
};

export type DataviewPropertyValueNotLink =
	| string
	| number
	| boolean
	| null
	| undefined
	| DateTime;
// | (string | number | boolean | null | undefined | DateTime)[];

export type DataviewPropertyValueArray =
	| DataviewPropertyValueNotLink[]
	| DataviewLink[];

export type DataviewPropertyValue =
	| DataviewPropertyValueNotLink
	| DataviewLink
	| DataviewPropertyValueArray;

export type DataviewQueryResultHeaders = string[];
export type DataviewQueryResultValues = DataviewPropertyValue[][];
export type DataviewQueryResultSuccess = {
	successful: true;
	value: {
		headers: DataviewQueryResultHeaders;
		values: DataviewQueryResultValues;
		type: "table" | string;
	};
};
export type DataviewQueryResultFail = {
	successful: false;
	error: string;
	value: undefined;
};
export type DataviewQueryResult =
	| DataviewQueryResultSuccess
	| DataviewQueryResultFail;

export type ModifiedDataviewQueryResult = DataviewQueryResult & {
	truePropertyNames: string[];
};

export type DataviewAPI = {
	settings: DataviewSettings;
	query(source: string, originFile?: string): Promise<DataviewQueryResult>;
	luxon: { DateTime: typeof DateTime };
	evaluate(
		source: string
	): Promise<
		{ successful: true; value: unknown } | { successful: false; error: string }
	>;
	/**
	 * @remark `.md` is optional
	 * @remark if filename is unique, then the full path isn't needed
	 */
	page(filename: string): Record<string, string>;
};

export type PropertyType =
	| string
	| "text"
	| "number"
	| "multitext"
	| "tags"
	| "aliases"
	| "cssclasses"
	| "date"
	| "datetime"
	| "checkbox"
	| "unknown";

export type PropertyInfo = {
	count: number;
	name: string;
	type: PropertyType;
};

//////////////////////////////////////////////////////////////////////
//                                                                  //
// https://blacksmithgu.github.io/obsidian-dataview/api/data-array/ //
//                                                                  //
//////////////////////////////////////////////////////////////////////

/** A function which maps an array element to some value. */
export type ArrayFunc<T, O> = (elem: T, index: number, arr: T[]) => O;

/** A function which compares two types. */
export type ArrayComparator<T> = (a: T, b: T) => number;

export interface DataArray<T> {
	/** The total number of elements in the array. */
	length: number;

	/** Filter the data array down to just elements which match the given predicate. */
	where(predicate: ArrayFunc<T, boolean>): DataArray<T>;
	/** Alias for 'where' for people who want array semantics. */
	filter(predicate: ArrayFunc<T, boolean>): DataArray<T>;

	/** Map elements in the data array by applying a function to each. */
	map<U>(f: ArrayFunc<T, U>): DataArray<U>;
	/** Map elements in the data array by applying a function to each, then flatten the results to produce a new array. */
	flatMap<U>(f: ArrayFunc<T, U[]>): DataArray<U>;
	/** Mutably change each value in the array, returning the same array which you can further chain off of. */
	mutate(f: ArrayFunc<T, any>): DataArray<any>;

	/** Limit the total number of entries in the array to the given value. */
	limit(count: number): DataArray<T>;
	/**
	 * Take a slice of the array. If `start` is undefined, it is assumed to be 0; if `end` is undefined, it is assumed
	 * to be the end of the array.
	 */
	slice(start?: number, end?: number): DataArray<T>;
	/** Concatenate the values in this data array with those of another iterable / data array / array. */
	concat(other: Iterable<T>): DataArray<T>;

	/** Return the first index of the given (optionally starting the search) */
	indexOf(element: T, fromIndex?: number): number;
	/** Return the first element that satisfies the given predicate. */
	find(pred: ArrayFunc<T, boolean>): T | undefined;
	/** Find the index of the first element that satisfies the given predicate. Returns -1 if nothing was found. */
	findIndex(pred: ArrayFunc<T, boolean>, fromIndex?: number): number;
	/** Returns true if the array contains the given element, and false otherwise. */
	includes(element: T): boolean;

	/**
	 * Return a string obtained by converting each element in the array to a string, and joining it with the
	 * given separator (which defaults to ', ').
	 */
	join(sep?: string): string;

	/**
	 * Return a sorted array sorted by the given key; an optional comparator can be provided, which will
	 * be used to compare the keys in leiu of the default dataview comparator.
	 */
	sort<U>(
		key: ArrayFunc<T, U>,
		direction?: "asc" | "desc",
		comparator?: ArrayComparator<U>
	): DataArray<T>;

	/**
	 * Return an array where elements are grouped by the given key; the resulting array will have objects of the form
	 * { key: <key value>, rows: DataArray }.
	 */
	groupBy<U>(
		key: ArrayFunc<T, U>,
		comparator?: ArrayComparator<U>
	): DataArray<{ key: U; rows: DataArray<T> }>;

	/**
	 * Return distinct entries. If a key is provided, then rows with distinct keys are returned.
	 */
	distinct<U>(
		key?: ArrayFunc<T, U>,
		comparator?: ArrayComparator<U>
	): DataArray<T>;

	/** Return true if the predicate is true for all values. */
	every(f: ArrayFunc<T, boolean>): boolean;
	/** Return true if the predicate is true for at least one value. */
	some(f: ArrayFunc<T, boolean>): boolean;
	/** Return true if the predicate is FALSE for all values. */
	none(f: ArrayFunc<T, boolean>): boolean;

	/** Return the first element in the data array. Returns undefined if the array is empty. */
	first(): T;
	/** Return the last element in the data array. Returns undefined if the array is empty. */
	last(): T;

	/** Map every element in this data array to the given key, and then flatten it.*/
	to(key: string): DataArray<any>;
	/**
	 * Recursively expand the given key, flattening a tree structure based on the key into a flat array. Useful for handling
	 * hierarchical data like tasks with 'subtasks'.
	 */
	expand(key: string): DataArray<any>;

	/** Run a lambda on each element in the array. */
	forEach(f: ArrayFunc<T, void>): void;

	/** Calculate the sum of the elements in the array. */
	sum(): number;

	/** Calculate the average of the elements in the array. */
	avg(): number;

	/** Calculate the minimum of the elements in the array. */
	min(): number;

	/** Calculate the maximum of the elements in the array. */
	max(): number;

	/** Convert this to a plain javascript array. */
	array(): T[];

	/** Allow iterating directly over the array. */
	[Symbol.iterator](): Iterator<T>;

	/** Map indexes to values. */
	[index: number]: any;
	/** Automatic flattening of fields. Equivalent to implicitly calling `array.to("field")` */
	[field: string]: any;
}
