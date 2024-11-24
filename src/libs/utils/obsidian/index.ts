import { App } from "obsidian";
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

export const getFileFromMarkdownLink = (
	app: App,
	sourcePath: string,
	mdLink: string
) => {
	const noBrackets =
		mdLink.startsWith("[[") && mdLink.endsWith("]]")
			? mdLink.slice(2, -2)
			: mdLink;
	const nonAliased = noBrackets.split(/(?<!\\)\|/g)[0];
	return app.metadataCache.getFirstLinkpathDest(nonAliased, sourcePath);
};
