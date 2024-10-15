import { en } from "./en";
import { es } from "./es";

const namespace = "better-properties-plugin";

/* Add bundles here */
i18next.addResourceBundle("en", namespace, en);
i18next.addResourceBundle("es", namespace, es);
/********************/

// export const getFixedT = () => i18next.getFixedT(null, namespace);
export const text = i18next.getFixedT(null, namespace);
