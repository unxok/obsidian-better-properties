import { vOptionalObjectWithDefault } from "#/lib/valibot";
import { PropertyTypeSettingsSchema } from "../../types";
// import * as v from "valibot";

export default vOptionalObjectWithDefault({
	// test: v.optional(v.string(), "Hello world"),
}) satisfies PropertyTypeSettingsSchema;
