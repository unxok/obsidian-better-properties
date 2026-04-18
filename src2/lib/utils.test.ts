import { describe, expect, test } from "vitest";
import {
	findNestedKey,
	getValueByKeys,
	parseObjectPathString,
	setValueByKeys,
} from "./utils";

describe("parseObjectPathString", () => {
	describe("Bracket notation", () => {
		// valid
		test("One key", () => {
			expect(parseObjectPathString(`foo["bar"]`)).toStrictEqual(["foo", "bar"]);
		});
		test("multiple keys", () => {
			expect(parseObjectPathString(`foo["bar"]["fizz"]["buzz"]`)).toStrictEqual(
				["foo", "bar", "fizz", "buzz"]
			);
		});
		test("mixed quotes", () => {
			expect(parseObjectPathString(`foo['bar']["fizz"]['buzz']`)).toStrictEqual(
				["foo", "bar", "fizz", "buzz"]
			);
		});

		// invalid
		test("missing opening quote", () => {
			expect(() =>
				parseObjectPathString(`foo["bar"]["fizz"][buzz"]`)
			).toThrowError();
		});
		test("missing closing quote", () => {
			expect(() =>
				parseObjectPathString(`foo["bar"]["fizz]["buzz"]`)
			).toThrowError();
		});
		test("missing opening bracket", () => {
			expect(() =>
				parseObjectPathString(`foo["bar"]"fizz"]["buzz"]`)
			).toThrowError();
		});
		test("missing closing bracket", () => {
			expect(() =>
				parseObjectPathString(`foo["bar"["fizz"]["buzz"]`)
			).toThrowError();
		});
		test("mismatching quotes", () => {
			expect(() =>
				parseObjectPathString(`foo["bar"]["fizz"]["buzz']`)
			).toThrowError();
		});
	});

	describe("Dot notation", () => {
		//valid
		test("one key", () => {
			expect(parseObjectPathString("foo.bar")).toStrictEqual(["foo", "bar"]);
		});
		test("multiple keys", () => {
			expect(parseObjectPathString("foo.bar.fizz.buzz")).toStrictEqual([
				"foo",
				"bar",
				"fizz",
				"buzz",
			]);
		});

		// invalid
		test("invalid key", () => {
			expect(() => parseObjectPathString("foo.bar..fizz")).toThrowError();
		});
	});
	describe("Index notation", () => {
		// valid
		test("one single digit key", () => {
			expect(parseObjectPathString("foo[2]")).toStrictEqual(["foo", "2"]);
		});
		test("one key with multiple digits", () => {
			expect(parseObjectPathString("foo[324]")).toStrictEqual(["foo", "324"]);
		});
		test("multiple keys", () => {
			expect(parseObjectPathString("foo[324][0][6][964]")).toStrictEqual([
				"foo",
				"324",
				"0",
				"6",
				"964",
			]);
		});

		// invalid
		test("one single digit key", () => {
			expect(() => parseObjectPathString("foo[2][invalid]")).toThrowError();
		});
	});

	test("mixed notation", () => {
		expect(parseObjectPathString(`foo["bar"].fizz`)).toStrictEqual([
			"foo",
			"bar",
			"fizz",
		]);
	});

	test("escaped characters", () => {
		expect(parseObjectPathString(`foo["ba\\"r"]`)).toStrictEqual([
			"foo",
			`ba\\"r`,
		]);
	});
});

describe("getValueByKeys", () => {
	const objectsSample = {
		foo: {
			bar: {
				fizz: "buzz",
			},
		},
	};

	const arraysSample = {
		foo: [["fizz", 5]],
	};

	const mixedSample = {
		foo: {
			bar: [
				[
					{
						fizz: "buzz",
					},
				],
				[
					{
						baz: true,
					},
				],
			],
		},
	};

	test("objects", () => {
		expect(
			getValueByKeys({
				obj: objectsSample,
				keys: ["foo", "bar", "fizz"],
			})
		).toBe("buzz");
	});

	test("arrays", () => {
		expect(
			getValueByKeys({
				obj: arraysSample,
				keys: ["foo", 0, 1],
			})
		).toBe(5);
	});

	test("mix of objects and arrays", () => {
		expect(
			getValueByKeys({
				obj: mixedSample,
				keys: ["foo", "bar", "1", "0", "baz"],
			})
		).toBe(true);
	});

	test("insensitive", () => {
		expect(
			getValueByKeys({
				obj: mixedSample,
				keys: ["Foo", "BAR", "1", "0", "BaZ"],
				insensitive: true,
			})
		).toBe(true);
	});

	test("key doesn't exist", () => {
		expect(
			getValueByKeys({
				obj: mixedSample,
				keys: ["baz"],
			})
		).toBe(undefined);
	});

	test("subkey doesn't exist", () => {
		expect(
			getValueByKeys({
				obj: mixedSample,
				keys: ["foo", "baz"],
			})
		).toBe(undefined);
	});

	test("subkey value not object/array", () => {
		expect(
			getValueByKeys({
				obj: mixedSample,
				keys: ["foo", "fizz"],
			})
		).toBe(undefined);
	});
});

describe("setValueByKeys", () => {
	const objectsSample = {
		foo: {
			bar: {
				fizz: "buzz",
			},
		},
	};

	const arraysSample = {
		foo: [["fizz", 5]],
	};

	const mixedSample = {
		foo: {
			bar: [
				[
					{
						baz: true,
					},
				],
				[
					{
						baz: true,
					},
				],
			],
		},
	};

	test("objects", () => {
		const obj = { ...objectsSample };
		setValueByKeys({
			obj,
			keys: ["foo", "bar", "fizz"],
			value: "baz",
		});
		expect(obj.foo.bar.fizz).toBe("baz");
	});
	test("arrays", () => {
		const obj = { ...arraysSample };
		setValueByKeys({
			obj,
			keys: ["foo", "0", 1],
			value: 26,
		});
		expect(obj.foo[0][1]).toBe(26);
	});
	test("mix of objects and arrays", () => {
		const obj = { ...mixedSample };
		setValueByKeys({
			obj,
			keys: ["foo", "bar", 1, "0", "baz"],
			value: false,
		});
		expect(obj.foo.bar[1][0].baz).toBe(false);
	});

	test("insensitive", () => {
		const obj = { ...mixedSample };
		setValueByKeys({
			obj,
			keys: ["FOO", "bAr", 1, "0", "baz"],
			value: false,
			insensitive: true,
		});
		expect(obj.foo.bar[1][0].baz).toBe(false);
	});
});

describe("findNestedKey", () => {
	const objectsSample = {
		foo: {
			bar: {
				fizz: "buzz",
			},
		},
	};

	const arraysSample = {
		foo: [["fizz", 5]],
	};

	const mixedSample = {
		foo: {
			bar: [
				[
					{
						baz: true,
					},
				],
				[
					{
						baz: true,
					},
				],
			],
		},
	};

	test("objects", () => {
		const obj = { ...objectsSample };
		const found = findNestedKey({
			obj,
			keys: ["foo", "bar", "fizz"],
		});
		expect(found).toBe("fizz");
	});
	test("arrays", () => {
		const obj = { ...arraysSample };
		const found = findNestedKey({
			obj,
			keys: ["foo", "0", 1],
		});
		expect(found).toBe("1");
	});
	test("mix of objects and arrays", () => {
		const obj = { ...mixedSample };
		const found = findNestedKey({
			obj,
			keys: ["foo", "bar", 1, "0", "baz"],
		});
		expect(found).toBe("baz");
	});

	test("insensitive", () => {
		const obj = { ...mixedSample };
		const found = findNestedKey({
			obj,
			keys: ["FOO", "bAr", 1, "0", "baZ"],
			insensitive: true,
		});
		expect(found).toBe("baz");
	});

	test("key not present", () => {
		const obj = { ...mixedSample };
		const found = findNestedKey({
			obj,
			keys: ["FOO", "bAr", 1, "0", "baZ", "buzz"],
			insensitive: true,
		});
		expect(found).toBe(undefined);
	});
});
