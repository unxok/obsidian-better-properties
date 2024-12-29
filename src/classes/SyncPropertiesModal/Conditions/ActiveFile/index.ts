import { BaseCondition, ConditionTypeOption } from "../types";

export interface ActiveFileCondition extends BaseCondition {
	conditionType: "activeFile";
	valid: boolean;
}

export const defaultActiveFileCondition: ActiveFileCondition = {
	conditionType: "activeFile",
	valid: true,
};
export const activeFileConditionOption: ConditionTypeOption<ActiveFileCondition> =
	{
		value: "activeFile",
		display: "Active note",
		icon: "file-check",
		renderer: (app, descEl, condition) => {
			descEl.textContent = "Required: Note is the same as active note.";
		},
	};
