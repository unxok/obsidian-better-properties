import { BaseCondition, ConditionTypeOption } from "../types";

export interface PropertyCondition extends BaseCondition {
	conditionType: "property";
	valid: boolean;
	state: {
		operator: string;
		propertyName: string;
		propertyValue: string;
	};
}

export const defaultPropertyCondition: PropertyCondition = {
	conditionType: "property",
	valid: true,
	state: { operator: "", propertyName: "", propertyValue: "" },
};
export const propertyConditionOption: ConditionTypeOption<PropertyCondition> = {
	value: "property",
	display: "Property",
	icon: "archive",
	renderer: (app, descEl, condition) => {},
};
