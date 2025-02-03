import {
	BlockWikilinkSuggestion,
	HeadingWikilinkSuggestion,
} from "@/classes/FileSuggest";
import { App, getLinkpath, MetadataCache, TFile } from "obsidian";
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

// recreation of the collator that obsidian uses for sorting suggestions
export const compareFunc = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: false,
}).compare;

/**
 * Improved version of built-in `MetadataCache.getLinkPathDest()`.
 *
 * ---
 * - [x] Text may or may not contain brackets
 * - [ ] Support for internal markdown links
 * - [ ] Support for external markdown links
 */
export const getFirstLinkPathDest = (
	mc: MetadataCache,
	originPath: string,
	text: string
) => {
	const noBrackets =
		text.startsWith("[[") && text.endsWith("]]") ? text.slice(2, -2) : text;

	const sectionCharIndex = noBrackets.indexOf("#");
	const noSectionLink =
		sectionCharIndex === -1
			? noBrackets
			: noBrackets.slice(0, sectionCharIndex);

	const aliasCharIndex = noSectionLink.indexOf("|");
	const noAlias =
		aliasCharIndex === -1
			? noSectionLink
			: noSectionLink.slice(0, aliasCharIndex);

	return mc.getFirstLinkpathDest(originPath, noAlias);
};

export const createInternalLinkEl = (
	file: TFile,
	parent?: HTMLElement,
	alias?: string
) => {
	const opts = {
		href: file.path,
		cls: "internal-link",
		text: alias ? alias : file.basename,
		attr: {
			"data-tooltip-position": "top",
			"aria-label": file.path,
			"target": "_blank",
			"rel": "noopener nofollow",
		},
	};
	return parent ? parent.createEl("a", opts) : createEl("a", opts);
};

export const getGlobalBlockSuggestions = async (app: App) => {
	// @ts-ignore TODO add proper typings
	return (await app.workspace.editorSuggest.suggests[0].suggestManager.getGlobalBlockSuggestions(
		{
			cancelled: true,
			onCancel: null,
			onStart: null,
			onStop: null,
			running: false,
		}
	)) as BlockWikilinkSuggestion[];
};

export const getGlobalHeadingSuggestions = async (app: App) => {
	// @ts-ignore TODO add proper typings
	return (await app.workspace.editorSuggest.suggests[0].suggestManager.getGlobalHeadingSuggestions(
		{
			cancelled: true,
			onCancel: null,
			onStart: null,
			onStop: null,
			running: false,
		}
	)) as HeadingWikilinkSuggestion[];
};
