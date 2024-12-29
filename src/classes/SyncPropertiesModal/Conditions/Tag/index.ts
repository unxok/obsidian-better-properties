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
export const tagConditionOption: ConditionTypeOption<TagCondition> = {
	value: "tag",
	display: "Tag",
	icon: "tag",
	renderer: (app, descEl, condition) => {
		const modal = new ConfirmationModal(app);

		modal.onClose = () => {
			const { importance, negated, tagName, tagType, includeNested } =
				condition.state;

			if (tagName) {
				condition.valid = true;
				descEl.style.removeProperty("color");
				descEl.textContent = `${
					conditionImportanceTypeDetails.find(([v]) => v === importance)![1]
				}: ${negated ? "Doesn't contain" : "Contains"} tag "${tagName}", ${
					includeNested ? "including nested tags" : "not including nested tags"
				}, within the note's ${
					tagType === "fm"
						? "properties"
						: tagType === "body"
						? "content"
						: "properties or content"
				}`;
			} else {
				condition.valid = false;
				descEl.style.color = "var(--text-error)";
				descEl.textContent = "Error: Tag name must not be empty!";
			}
		};

		modal.onOpen = () => {
			const { contentEl } = modal;
			contentEl.empty();
			modal.setTitle("Tag condition");
			contentEl.createDiv({
				cls: "better-properties-modal-desc",
				text: "Looks for notes containing a given tag.",
			});

			new Setting(contentEl)
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
				});

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
