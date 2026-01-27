// TODO move all pure functions out of ./index into here and write tests

/**
 * Remake of Obsidian's provided `parseLinkText()` with the following changes:
 * - Brackets may be included in the linktext
 * - Alias will be parsed as well
 */
export const parseLinkText = (
	linktext: string
): {
	path: string;
	subpath: string | undefined;
	alias: string | undefined;
} => {
	const noBrackets =
		linktext.startsWith("[[") && linktext.endsWith("]]")
			? linktext.slice(2, -2)
			: linktext;

	const data: ReturnType<typeof parseLinkText> = {
		path: "",
		subpath: undefined,
		alias: undefined,
	};

	let mode: keyof typeof data = "path";

	noBrackets.split("").forEach((char) => {
		if (char === "#") {
			mode = "subpath";
			return;
		}
		if (char === "|") {
			mode = "alias";
			return;
		}

		if (data[mode] === undefined) data[mode] = "";
		data[mode] += char;
	});

	// obsidian natively trims whitespace in wikilinks like this
	data.path = data.path.trimStart();
	data.subpath = data.subpath?.trimEnd();

	return data;
};
