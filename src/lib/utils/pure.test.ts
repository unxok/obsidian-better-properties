import { describe, test, expect } from "vitest";
import { parseLinkText } from "./pure";

describe("parseLinkText", () => {
	type R = ReturnType<typeof parseLinkText>;

	test("With brackets and path", () => {
		expect(parseLinkText("[[myNote]]")).toEqual<R>({
			path: "myNote",
			subpath: undefined,
			alias: undefined,
		});
	});

	test("With path", () => {
		expect(parseLinkText("myNote")).toEqual<R>({
			path: "myNote",
			subpath: undefined,
			alias: undefined,
		});
	});

	test("With brackets and subpath", () => {
		expect(parseLinkText("[[#header]]")).toEqual<R>({
			path: "",
			subpath: "header",
			alias: undefined,
		});
	});

	test("With path and subpath", () => {
		expect(parseLinkText("myNote#header")).toEqual<R>({
			path: "myNote",
			subpath: "header",
			alias: undefined,
		});
	});

	test("With path, subpath, and alias", () => {
		expect(parseLinkText("myNote#header|myAlias")).toEqual<R>({
			path: "myNote",
			subpath: "header",
			alias: "myAlias",
		});
	});

	test("With path and alias", () => {
		expect(parseLinkText("[[myNote|myAlias]]")).toEqual<R>({
			path: "myNote",
			subpath: undefined,
			alias: "myAlias",
		});
	});

	test("With various whitespace", () => {
		// This emulates how Obsidian natively trims whitespace in wikilinks
		expect(parseLinkText("[[   myNote #heading |  myAlias  ]]")).toEqual<R>({
			path: "myNote ",
			subpath: "heading",
			alias: "  myAlias  ",
		});
	});
});
