/**
 * Recursively waits the interval (default 0 ms) until `checker` returns `true`
 */
export const waitUntil = async (
	checker: () => boolean,
	interval: number = 0
): Promise<void> => {
	await new Promise<void>((res) => {
		window.setTimeout(() => {
			res();
		}, interval);
	});

	if (!checker()) {
		return await waitUntil(checker, interval);
	}
};

/**
 * Parses a object-key-access-notation string to an array of keys
 *
 * ---
 *
 * ```ts
 * parseObjectPath(`foo["bar"].fizz[2]`) // ["foo", "bar", "fizz", 2]
 * ```
 */
export const parseObjectPathString = (path: string): string[] => {
	const trimmedPath = path.trim();
	const currentChar = () => trimmedPath[i];
	const previousChar = () => trimmedPath[i - 1];
	const skipChar = () => i++;
	const result: string[] = [];
	let i = 0;

	while (i < trimmedPath.length) {
		if (
			previousChar() === "]" &&
			currentChar() !== undefined &&
			currentChar() !== "[" &&
			currentChar() !== "."
		) {
			throw new Error(
				`Invalid path: Expected opening bracket or dot following a closing bracket, but got ${currentChar()}`
			);
		}

		if (previousChar() === "." && currentChar() === ".") {
			throw new Error("Invalid path: Cannot have two consecutive dots");
		}

		if (currentChar() === ".") {
			skipChar();
			continue;
		}

		if (currentChar() === "[") {
			skipChar();

			// quoted key
			if (currentChar() === `"` || currentChar() === `'`) {
				const quote = currentChar();
				skipChar();

				let key = "";
				while (
					i < trimmedPath.length &&
					(currentChar() !== quote ||
						(currentChar() === quote && previousChar() === "\\"))
				) {
					key += currentChar();
					skipChar();
				}

				skipChar(); // skip closing quote

				if (currentChar() !== "]") {
					throw new Error(
						`Invalid path: Expected closing bracket but got "${currentChar()}" prev: "${previousChar()}"`
					);
				}

				skipChar(); // skip ]
				result.push(key);
				continue;
			}

			// Numeric index
			let index = "";
			while (i < trimmedPath.length && currentChar() !== "]") {
				if (Number.isNaN(Number(currentChar()))) {
					throw new Error(
						`Invalid path: Expected numeric digit for index notation, but got "${currentChar()}"`
					);
				}
				index += currentChar();
				skipChar();
			}

			if (currentChar() !== "]") {
				throw new Error(
					`Invalid path: Expected closing bracket but got "${currentChar()}"`
				);
			}

			// skip ]
			skipChar();

			result.push(index);
			continue;
		}

		// Dot notation key
		let key = "";
		while (
			i < trimmedPath.length &&
			currentChar() !== "." &&
			currentChar() !== "["
		) {
			key += currentChar();
			skipChar();
		}

		if (key.length) result.push(key);
	}

	return result;
};

/**
 * Gets a nested value in an object using an array of keys
 */
export const getValueByKeys = ({
	obj,
	keys,
	insensitive,
}: {
	obj: Record<string, unknown>;
	keys: (string | number)[];
	insensitive?: boolean;
}) => {
	let currentObj = obj;

	for (let i = 0; i < keys.length; i++) {
		const initialkey = keys[i].toString();
		const lowerInitialKey = initialkey.toLowerCase();
		const key = insensitive
			? Object.keys(currentObj).find(
					(k) => k.toLowerCase() === lowerInitialKey
			  ) ?? initialkey
			: initialkey;

		const value = currentObj[key];

		// return the value if on the last key
		if (i === keys.length - 1) {
			return value;
		}

		// not last key and value is object/array
		if (!!value && typeof value === "object") {
			currentObj = value as Record<string, unknown>;
			continue;
		}

		// last key but value not object/array
		return undefined;
	}
};

/**
 * Sets a nested value in an object using an array of keys
 */
export const setValueByKeys = ({
	obj,
	keys,
	value,
	insensitive,
}: {
	obj: Record<string | number, unknown>;
	keys: (string | number)[];
	value: unknown;
	insensitive?: boolean;
}) => {
	let currentObj: Record<string, unknown> = obj;

	for (let i = 0; i < keys.length; i++) {
		const initialkey = keys[i].toString();
		const lowerInitialKey = initialkey.toLowerCase();
		const key = insensitive
			? Object.keys(currentObj).find(
					(k) => k.toLowerCase() === lowerInitialKey
			  ) ?? initialkey
			: initialkey;

		// on last key, so set value and exit
		if (i === keys.length - 1) {
			currentObj[key] = value;
			return;
		}

		// next value is object, so set to current and continue
		if (currentObj[key] && typeof currentObj[key] === "object") {
			currentObj = currentObj[key] as Record<string, unknown>;
			continue;
		}

		// set next value to object and continue
		currentObj[key] = {};
	}
};

/**
 * Sets a nested value in an object using an array of keys
 */
export const findNestedKey = ({
	obj,
	keys,
	insensitive,
}: {
	obj: Record<string | number, unknown>;
	keys: (string | number)[];
	insensitive?: boolean;
}) => {
	let currentObj: Record<string, unknown> = obj;

	for (let i = 0; i < keys.length; i++) {
		const initialkey = keys[i].toString();
		const lowerInitialKey = initialkey.toLowerCase();
		const key = insensitive
			? Object.keys(currentObj).find(
					(k) => k.toLowerCase() === lowerInitialKey
			  ) ?? initialkey
			: initialkey;

		// on last key, so return it
		if (i === keys.length - 1) {
			return key;
		}

		// next value is object, so set to current and continue
		if (currentObj[key] && typeof currentObj[key] === "object") {
			currentObj = currentObj[key] as Record<string, unknown>;
			continue;
		}

		// next value not an object, so final key cannot be found
		return undefined;
	}
};

export type TryCatchResult<T> =
	| {
			success: true;
			data: T;
			error: undefined;
	  }
	| {
			success: false;
			data: undefined;
			error: string;
	  };

/**
 * Async functional wrapper for try-catch blocks
 */
export const tryCatch = async <T>(
	toTry: Promise<T> | (() => Promise<T> | T)
): Promise<TryCatchResult<T>> => {
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

/**
 * Synchronous functional wrapper for try-catch blocks
 */
export const syncTryCatch = <T>(toTry: () => T): TryCatchResult<T> => {
	try {
		const data = toTry();
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

/**
 * Convert a string to a hash
 */
export const hashString = (str: string): number => {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}

	hash ^= hash >> 16;
	hash *= 0x7feb352d;
	hash ^= hash >> 15;

	return Math.abs(hash);
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
