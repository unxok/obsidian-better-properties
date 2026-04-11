import { vOptionalObjectWithDefault } from "#/lib/valibot";
import { PropertyTypeSettingsSchema } from "../../types";
import { standardSelectSettingsSchemaEntries } from "./utils/standardSettingsSchema";

export default vOptionalObjectWithDefault({
	...standardSelectSettingsSchemaEntries,
}) satisfies PropertyTypeSettingsSchema;
