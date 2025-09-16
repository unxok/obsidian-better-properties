import { tryCatch } from "~/lib/utils";
import BetterProperties from "~/main";
import { PropertySettings } from "../types";

export type SelectSettings = NonNullable<PropertySettings["select"]>;
export type SelectOptionsType = NonNullable<SelectSettings["optionsType"]>;
export type SelectOption = NonNullable<SelectSettings["manualOptions"]>[number];

// prettier-ignore
export const selectOptionInlineCodeTemplate = 
`async (props) => {
	const fooOption = {
		value: "foo",
		label: "bar", // optional
		bgColor: "green", // optional
	};
	const fizzOption = {
		value: "fizz",
	};
	const arr = [fooOption, fizzOption];
	return arr;
};`

export const selectOptionJsFileTemplate =
	`module.default = ` + selectOptionInlineCodeTemplate;

export type InlineCodeFunction = (props: {
	plugin: BetterProperties;
	sourcePath: string | undefined;
}) => Promise<SelectOption[]>;

export const tryRunInlineCode = async (
	plugin: BetterProperties,
	fnString: string | InlineCodeFunction
) => {
	return tryCatch(async () => {
		const fn: InlineCodeFunction =
			typeof fnString === "string" ? eval(fnString) : fnString;
		if (typeof fn !== "function") {
			throw new Error(`Expected type "function" but got type ${typeof fn}`);
		}
		const result = await fn({
			plugin,
			sourcePath: "",
		});
		if (!Array.isArray(result)) {
			throw new Error(`The value returned must be an array`);
		}
		result.forEach((item) => {
			if (typeof item !== "object" || !item) {
				throw new Error(
					`Expected type of item to be "object" but got type "${typeof item}"`
				);
			}
			if (typeof item.value !== "string") {
				throw new Error(
					`Expected typeof item.value to be "string" but got type "${typeof item.value}"`
				);
			}
		});
		return result;
	});
};

export const tryRunFileCode = async (
	plugin: BetterProperties,
	filePath: string
) => {
	return tryCatch(async () => {
		const file = plugin.app.vault.getFileByPath(filePath);
		if (!file) {
			throw new Error(`File not found at path "${filePath}"`);
		}

		if (!file.extension.toLowerCase().endsWith("js")) {
			throw new Error(
				`Expected file extension ".js" but got ".${file.extension}"`
			);
		}

		const content = await plugin.app.vault.cachedRead(file);
		const module: {
			default?: InlineCodeFunction;
		} = {};
		eval(content); // should define module.default

		if (typeof module.default !== "function") {
			throw new Error(
				`Expected typeof module.default to be "function" but got "${typeof module.default}"`
			);
		}

		const { success, data, error } = await tryRunInlineCode(
			plugin,
			module.default
		);
		if (success) return data;
		throw new Error(error);
	});
};
