import { NestedPaths } from "~/lib/utils";
import en from "./languages/en.json";

const ns = "better-properties";

// add language packs below

window.i18next.addResourceBundle("en", ns, en); // English

//////////////////

const fixedT = window.i18next.getFixedT(null, ns);
export const text = (
	key: NestedPaths<typeof en>,
	variables?: Record<string, string>
) => {
	fixedT(key, variables);
};
