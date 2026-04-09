import en from "./languages/en.json";

const ns = "better-properties";

// add language packs below

window.i18next.addResourceBundle("en", ns, en); // English

//////////////////

const fixedT = window.i18next.getFixedT(null, ns);

type EN = typeof en;

export type NestedPaths<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends Record<string, unknown>
		? `${Prefix}${K}` | NestedPaths<T[K], `${Prefix}${K}.`>
		: `${Prefix}${K}`;
}[keyof T & string];

export const text = <T extends NestedPaths<EN>>(
	key: T,
	variables?: Record<string, string>
): string => {
	return fixedT(key, variables);
};
