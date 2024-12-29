import { ConfirmationModal } from "@/classes/ConfirmationModal";
import { TagSuggest } from "@/classes/TagSuggest";
import { Setting } from "obsidian";
import {
	BaseCondition,
	ConditionImportance,
	conditionImportanceTypeDetails,
	conditionImportanceTypes,
	ConditionTypeOption,
} from "../types";

export const tagTypes = ["both", "fm", "body"] as const;
export type TagType = (typeof tagTypes)[number];
export const tagTypeDetails: [TagType, string][] = [
	["both", "Properties or body"],
	["fm", "Properties"],
	["body", "Body"],
];

export interface TagCondition extends BaseCondition {
	conditionType: "tag";
	valid: boolean;
	state: {
		importance: ConditionImportance;
		negated: boolean;
		includeNested: boolean;
		tagType: TagType;
		tagName: string;
	};
}
export const defaultTagCondition: TagCondition = {
	conditionType: "tag",
	valid: true,
	state: {
		importance: conditionImportanceTypes[0],
		negated: false,
		tagName: "",
		includeNested: false,
		tagType: tagTypes[0],
	},
};

const renderDescription = (setting: Setting, condition: TagCondition) => {
	const { importance, negated, tagName, includeNested, tagType } =
		condition.state;
	const { nameEl, descEl } = setting;

	if (!tagName) {
		condition.valid = false;
		descEl.style.color = "var(--text-error)";
		nameEl.textContent = "Tag: ???";
		descEl.textContent = "Error: Tag name must not be empty!";
		return;
	}

	condition.valid = true;
	descEl.style.removeProperty("color");

	nameEl.textContent = "Tag: " + tagName;

	const stateText = {
		/* importance: conditionImportanceTypeDetails.find(
			([v]) => v === importance
		)![1], */
		negated: negated ? "doesn't contain tag" : "contains tag",
		tagType:
			tagType === "fm"
				? "where tag is in the note's properties"
				: tagType === "body"
				? "where tag is in the note's body"
				: "where tag is in the note's properties or body",
		includeNested: includeNested
			? "including nested tags"
			: "not including nested tags",
	};
	descEl.textContent = Object.values(stateText).join(", ");
};

export const tagConditionOption: ConditionTypeOption<TagCondition> = {
	value: "tag",
	display: "Tag",
	icon: "tag",
	renderer: (app, setting, condition) => {
		const modal = new ConfirmationModal(app);

		modal.onClose = () => {
			renderDescription(setting, condition);
		};

		modal.onOpen = () => {
			const { contentEl } = modal;
			contentEl.empty();
			modal.setTitle("Tag condition");
			contentEl.createDiv({
				cls: "better-properties-modal-desc",
				text: "Looks for notes containing a given tag.",
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
				.setName("Does not contain tag")
				.setDesc(
					"Negates this condition to look for notes that do NOT contain this tag."
				)
				.addToggle((cmp) =>
					cmp
						.setValue(condition.state.negated)
						.onChange((b) => (condition.state.negated = b))
				);

			new Setting(contentEl)
				.setName("Tag name")
				.setDesc("The tag name to look for within notes.")
				.addSearch((cmp) => {
					cmp.setValue(condition.state.tagName);
					cmp.onChange((v) => (condition.state.tagName = v));
					new TagSuggest(app, cmp);
				});

			new Setting(contentEl)
				.setName("Include nested tags")
				.setDesc(
					"Whether to include notes with tags which are nested within the selected tag."
				)
				.addToggle((cmp) =>
					cmp
						.setValue(condition.state.includeNested)
						.onChange((b) => (condition.state.includeNested = b))
				);

			new Setting(contentEl)
				.setName("Tag type")
				.setDesc("Where the tag must be located in the note.")
				.addDropdown((cmp) => {
					tagTypeDetails.forEach(([v, d]) => cmp.addOption(v, d));
					cmp.setValue(condition.state.tagType);
					cmp.onChange((v) => (condition.state.tagType = v as TagType));
				});

			modal.createFooterButton((cmp) =>
				cmp.setButtonText("close").onClick(() => modal.close())
			);
		};

		modal.open();
	},
};
