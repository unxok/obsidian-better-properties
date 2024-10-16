import { parseYaml } from "obsidian";

type ParseYamlResult =
	| {
			success: true;
			data: unknown;
	  }
	| {
			success: false;
			error: unknown;
	  };

export const tryParseYaml: (str: string) => ParseYamlResult = (str) => {
	try {
		const data: unknown = parseYaml(str);
		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
};
