import "i18next";
import { TranslationResource } from "./resource";

declare module "i18next" {
	interface CustomTypeOptions {
		resources: {
			"better-properties-plugin": TranslationResource;
		};
	}
}
