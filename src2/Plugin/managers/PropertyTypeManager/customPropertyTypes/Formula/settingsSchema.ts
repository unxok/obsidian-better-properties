import { vOptionalObjectWithDefault } from "#/lib/valibot";
import { PropertyTypeSettingsSchema } from "../../types";
import * as v from "valibot";

export default vOptionalObjectWithDefault({
	formula: v.optional(v.string(), ""),
}) satisfies PropertyTypeSettingsSchema;
