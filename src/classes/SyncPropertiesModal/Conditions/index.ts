import {
	ActiveFileCondition,
	activeFileConditionOption,
	defaultActiveFileCondition,
} from "./ActiveFile";
import {
	FolderCondition,
	folderConditionOption,
	defaultFolderCondition,
} from "./Folder";
import {
	PropertyCondition,
	propertyConditionOption,
	defaultPropertyCondition,
} from "./Property";
import { TagCondition, tagConditionOption, defaultTagCondition } from "./Tag";

export type ToFileCondition =
	| FolderCondition
	| TagCondition
	| PropertyCondition
	| ActiveFileCondition;

export const conditionTypeOptions = [
	folderConditionOption,
	tagConditionOption,
	propertyConditionOption,
	activeFileConditionOption,
];

export const defaultConditions: Record<
	ToFileCondition["conditionType"],
	ToFileCondition
> = {
	folder: defaultFolderCondition,
	tag: defaultTagCondition,
	property: defaultPropertyCondition,
	activeFile: defaultActiveFileCondition,
};
