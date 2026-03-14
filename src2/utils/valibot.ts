import * as v from "valibot";

/**
 * Creates an optional schema which has a default value of the provided object schema parsed with an empty object
 */
export const vOptionalObject = <
	T extends v.ObjectSchema<v.ObjectEntries, undefined>
>(
	schema: T
) => {
	return v.optional(schema, v.parse(schema, {}));
};
