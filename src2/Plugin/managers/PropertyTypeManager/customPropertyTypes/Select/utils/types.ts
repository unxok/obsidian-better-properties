import { PropertySettings } from "../../../schema";
import typeKey from "../type";

export type SelectSettings = PropertySettings["types"][typeof typeKey];
export type SelectOption = SelectSettings["manualOptions"][number];
export type StandardSelectSettings = Pick<
	SelectSettings,
	| "optionsType"
	| "manualOptions"
	| "manualAllowCreate"
	| "inlineBase"
	| "baseFile"
	| "baseLabelColumn"
	| "baseBackgroundColumn"
	| "formula"
>;
