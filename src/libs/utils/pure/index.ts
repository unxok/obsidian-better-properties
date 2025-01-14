import { PropertySettings } from "@/PropertySettings";

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

export const getButtonStyledClass = (
	style: PropertySettings["button"]["style"]
) => {
	if (style === "accent") return "mod-cta";
	if (style === "destructive") return "mod-destructive";
	if (style === "ghost") return "clickable-icon";
	if (style === "muted") return "mod-muted";
	if (style === "warning") return "mod-warning";
	return "";
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

// Vite complains if you straight use eval
// but I need to use it sometimes to allow users to use JS for certain things
export const dangerousEval = eval;

export const findKeyInsensitive = (
	key: string,
	obj: Record<string, unknown>
) => {
	const lower = key.toLowerCase();
	const found = Object.keys(obj).find((k) => k.toLowerCase() === lower);
	return found ?? null;
};

type ParseJsonResult =
	| {
			success: true;
			data: unknown;
	  }
	| {
			success: false;
			error: unknown;
	  };

export const tryParseJson: (str: string) => ParseJsonResult = (str) => {
	try {
		const data: unknown = JSON.parse(str);
		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
};

export const findKeyValueByDotNotation = (
	key: string,
	obj: Record<string, any>
) => {
	const keys = key.toLowerCase().split(".");

	let current = obj;
	for (const k of keys) {
		if (typeof current !== "object") return null;
		const foundKey = Object.keys(current).find(
			(objKey) => objKey.toLowerCase() === k
		);

		if (!foundKey) return null;
		current = current[foundKey];
	}
	return current;
};

export const updateNestedObject = (
	obj: Record<string, any>,
	key: string,
	value: any
) => {
	const keys = key.split(".");
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const k = keys[i];

		// Ensure the current level exists and is an object
		if (!current[k] || typeof current[k] !== "object") {
			current[k] = {};
		}

		current = current[k];
	}

	// Update the final key with the given value
	current[keys[keys.length - 1]] = value;

	return obj;
};

export const splitStringIntoChunks = (str: string, num: number) => {
	const arr = [];

	for (let i = 0; i < str.length; i += num) {
		arr.push(str.substring(i, i + num));
	}

	return arr;
};

export const toFirstUpperCase = (s: string) => {
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const unsafeEval = eval;
