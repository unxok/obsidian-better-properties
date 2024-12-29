import { App, Setting } from "obsidian";
import { ToFileCondition } from ".";

export const conditionImportanceTypes = ["required", "optional"] as const;
export type ConditionImportance = (typeof conditionImportanceTypes)[number];
export const conditionImportanceTypeDetails: [ConditionImportance, string][] = [
	["required", "Required"],
	["optional", "Optional"],
];
export interface BaseCondition {
	conditionType: string;
	valid: boolean;
}
export type ConditionTypeOption<T extends ToFileCondition> = {
	value: T["conditionType"];
	display: string;
	icon: string;
	renderer: (app: App, rowSetting: Setting, condition: T) => void;
};
