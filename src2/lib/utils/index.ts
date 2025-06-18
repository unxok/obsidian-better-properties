import { App, MetadataCache } from "obsidian";

type Satisfies<Constraint, Type> = Type extends Constraint ? Type : never;

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

type NonNullishObject<T> = {
	[K in keyof T]-?: NonNullable<T[K]>;
};

type TryCatchResult<T> = Promise<
	| {
			success: true;
			data: T;
			error: undefined;
	  }
	| {
			success: false;
			data: undefined;
			error: string;
	  }
>;

const tryCatch = async <T>(
	toTry: Promise<T> | (() => Promise<T> | T)
): TryCatchResult<T> => {
	try {
		const data = typeof toTry === "function" ? await toTry() : await toTry;
		return { success: true, data, error: undefined };
	} catch (e) {
		const error =
			e instanceof Error
				? e.message
				: typeof e === "string"
				? e
				: e?.toString
				? e.toString()
				: "Unknown error";
		return { success: false, data: undefined, error };
	}
};

export { type Satisfies, type Prettify, type NonNullishObject, tryCatch };

export const getPropertyType = (app: App, property: string): string => {
	const lower = property.toLowerCase();
	const found = Object.values(app.metadataTypeManager.properties).find(
		({ name }) => lower === name.toLowerCase()
	);
	return found?.widget ?? "unset";
};

/**
 * Returns a number or the min or max if it's out of bounds.
 *
 * Is inclusive with min and max by default.
 */
export const clampNumber = (
	num: number,
	min: number,
	max: number,
	nonInclusive?: boolean
) => {
	const underMin = nonInclusive ? num < min : num <= min;
	if (underMin) return min;
	const overMax = nonInclusive ? num > max : num >= max;
	if (overMax) return max;
	return num;
};

/**
 * Move an item in an array from one index to another
 * @remark You are responsible for ensuring the indexes are valid
 * @tutorial
 * ```ts
 * const arr = ['a', 'b', 'c', 'd'];
 * const newArr = arrayMove(arr, 1, 3);
 * // ['a', 'c', 'd', 'c']
 * ```
 */
export const arrayMove = <T>(arr: T[], from: number, to: number) => {
	const copy = [...arr];
	const item = copy[from];
	copy.splice(from, 1);
	copy.splice(to, 0, item);
	return copy;
};

/**
 * Improved version of built-in `MetadataCache.getLinkPathDest()`.
 *
 * ---
 * - [x] Text may or may not contain brackets
 * - [ ] Support for internal markdown links
 * - [ ] Support for external markdown links
 */
export const getFirstLinkPathDest = (
	mc: MetadataCache,
	originPath: string,
	text: string
) => {
	const noBrackets =
		text.startsWith("[[") && text.endsWith("]]") ? text.slice(2, -2) : text;

	const sectionCharIndex = noBrackets.indexOf("#");
	const noSectionLink =
		sectionCharIndex === -1
			? noBrackets
			: noBrackets.slice(0, sectionCharIndex);

	const aliasCharIndex = noSectionLink.indexOf("|");
	const noAlias =
		aliasCharIndex === -1
			? noSectionLink
			: noSectionLink.slice(0, aliasCharIndex);

	return mc.getFirstLinkpathDest(noAlias, originPath);
};
