import { PropertySettingsSchema } from "../../types";
import * as v from "valibot";

export default v.object({
	test: v.optional(v.string(), "Hello world"),
}) satisfies PropertySettingsSchema;
