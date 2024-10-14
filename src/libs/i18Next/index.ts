import { en } from "./en";

const namespace = "better-properties-plugin";

/* Add bundles here */
i18next.addResourceBundle("en", namespace, en);

/********************/

// export const getFixedT = () => i18next.getFixedT(null, namespace);
export const text = i18next.getFixedT(null, namespace);
