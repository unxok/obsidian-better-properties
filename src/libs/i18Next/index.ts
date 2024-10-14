import { en } from "./en";
import { TranslationResource } from "./resource";

const namespace = "better-properties-plugin";

/* Add bundles here */
i18next.addResourceBundle("en", namespace, en);

/********************/

export const getFixedT = () => {
	const tFunc = i18next.getFixedT(null, namespace);
	return (textKey: keyof TranslationResource) => tFunc(textKey.toString());
};
