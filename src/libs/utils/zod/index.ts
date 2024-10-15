import { z } from "zod";

export const catchAndInfer = <T extends z.ZodRawShape>(
	schema: z.ZodObject<T>
) => {
	const defaultSchema = schema.parse({});
	return schema.catch(defaultSchema);
};
