import { DropdownComponent, Setting, TextComponent } from "obsidian";
import {
	BaseCondition,
	ConditionImportance,
	conditionImportanceTypeDetails,
	conditionImportanceTypes,
	ConditionTypeOption,
} from "../types";
import { ConfirmationModal } from "@/classes/ConfirmationModal";
import { PropertySuggest } from "@/classes/PropertySuggest";

const operators = [
	"hasPropLinkActiveFile",
	"hasProp",
	"notHasProp",
	"hasPropValue",
	"notHasPropValue",
] as const;
type Operator = (typeof operators)[number];
const operatorDetails: [Operator, string][] = [
	["hasPropLinkActiveFile", "has property which links to active note"],
	["hasProp", "has property"],
	["notHasProp", "doesn't have property"],
	["hasPropValue", "has property with given value"],
	["notHasPropValue", "doesn't have property with given value"],
];

export interface PropertyCondition extends BaseCondition {
	conditionType: "property";
	valid: boolean;
	state: {
		importance: ConditionImportance;
		operator: Operator;
		propertyName: string;
		propertyValue: string;
	};
}

export const defaultPropertyCondition: PropertyCondition = {
	conditionType: "property",
	valid: true,
	state: {
		importance: conditionImportanceTypes[0],
		operator: operators[0],
		propertyName: "",
		propertyValue: "",
	},
};

const updateSettingText = (setting: Setting, condition: PropertyCondition) => {
	const { importance, operator, propertyName, propertyValue } = condition.state;
	const { nameEl, descEl } = setting;

	if (!propertyName) {
		condition.valid = false;
		descEl.style.color = "var(--text-error)";
		nameEl.textContent = "Property: ???";
		descEl.textContent = "Property name cannot be empty!";
		return;
	}

	condition.valid = true;
	descEl.style.removeProperty("color");

	nameEl.textContent = "Property: " + propertyName;

	const stateText = {
		/* importance: conditionImportanceTypeDetails.find(
			([v]) => v === importance
		)![1], */
		negatedOperator: operatorDetails.find(([v]) => v === operator)![1],
		propValue: propertyValue ? "value: " + propertyValue : "",
	};

	descEl.textContent = Object.values(stateText).join(", ");
};

export const propertyConditionOption: ConditionTypeOption<PropertyCondition> = {
	value: "property",
	display: "Property",
	icon: "archive",
	renderer: (app, setting, condition) => {
		const modal = new ConfirmationModal(app);

		modal.onClose = () => {
			updateSettingText(setting, condition);
		};

		modal.onOpen = () => {
			const { contentEl } = modal;
			contentEl.empty();
			modal.setTitle("Property condition");
			contentEl.createDiv({
				cls: "better-properties-modal-desc",
				text: "Looks for notes with a given property",
			});

			/*			new Setting(contentEl)
				.setName("Importance")
				.setDesc("The importance of this condition.")
				.addDropdown((cmp) => {
					conditionImportanceTypeDetails.forEach(([v, d]) =>
						cmp.addOption(v, d)
					);
					cmp.setValue(condition.state.importance);
					cmp.onChange(
						(v) => (condition.state.importance = v as ConditionImportance)
					);
				}); */

			new Setting(contentEl)
				.setName("Property name")
				.setDesc("The name of the property to look for.")
				.addSearch((cmp) => {
					cmp.setValue(condition.state.propertyName);
					cmp.onChange((b) => (condition.state.propertyName = b));
					new PropertySuggest(app, cmp);
				});

			let operatorDropdown: DropdownComponent;

			new Setting(contentEl)
				.setName("Match type")
				.setDesc("How the note must match the property.")
				.addDropdown((cmp) => {
					operatorDropdown = cmp;
					operatorDetails.forEach(([v, d]) => cmp.addOption(v, d));
					cmp.setValue(condition.state.operator);
				});

			const propValueSetting = new Setting(contentEl)
				.setName("Property value")
				.setDesc("The value corresponding to the previous setting.")
				.addText((cmp) => {
					cmp.setValue(condition.state.propertyValue);
					cmp.onChange((v) => (condition.state.propertyValue = v));
				});

			const onOperatorDropdownChange = (v: string) => {
				const op = v as Operator;
				condition.state.operator = op;
				if (op === "hasPropValue" || op === "notHasPropValue") {
					return propValueSetting.settingEl.style.removeProperty("display");
				}
				propValueSetting.settingEl.style.display = "none";
			};

			operatorDropdown!.onChange(onOperatorDropdownChange);

			onOperatorDropdownChange(condition.state.operator);

			modal.createFooterButton((cmp) =>
				cmp.setButtonText("close").onClick(() => modal.close())
			);
		};

		modal.open();
	},
};
