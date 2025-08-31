import { NestedPaths } from "~/lib/utils";
import en from "./languages/en.json";

const ns = "better-properties";

// add language packs below

window.i18next.addResourceBundle("en", ns, en); // English

//////////////////

const fixedT = window.i18next.getFixedT(null, ns);

type EN = typeof en;
export const text = <T extends NestedPaths<EN>>(
	key: T,
	variables?: Record<string, string>
): string => {
	return fixedT(key, variables);
};
