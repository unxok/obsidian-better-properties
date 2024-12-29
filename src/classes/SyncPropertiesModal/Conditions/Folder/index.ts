import { ConfirmationModal } from "@/classes/ConfirmationModal";
import { FolderSuggest } from "@/classes/FolderSuggest";
import { Setting } from "obsidian";
import {
	BaseCondition,
	ConditionImportance,
	conditionImportanceTypes,
	ConditionTypeOption,
	conditionImportanceTypeDetails,
} from "../types";

export interface FolderCondition extends BaseCondition {
	conditionType: "folder";
	valid: boolean;
	state: {
		importance: ConditionImportance;
		negated: boolean;
		includeSubfolders: boolean;
		folderPath: string;
	};
}
export const defaultFolderCondition: FolderCondition = {
	conditionType: "folder",
	valid: true,
	state: {
		importance: conditionImportanceTypes[0],
		negated: false,
		folderPath: "",
		includeSubfolders: false,
	},
};
export const folderConditionOption: ConditionTypeOption<FolderCondition> = {
	value: "folder",
	display: "Folder",
	icon: "folder",
	renderer: (app, descEl, condition) => {
		const modal = new ConfirmationModal(app);

		modal.onClose = () => {
			const { importance, negated, folderPath, includeSubfolders } =
				condition.state;

			if (folderPath) {
				condition.valid = true;
				descEl.style.removeProperty("color");
				descEl.textContent = `${
					conditionImportanceTypeDetails.find(([v]) => v === importance)![1]
				}: ${negated ? "Not in" : "In"} folder "${folderPath}", ${
					includeSubfolders
						? "including subfolders"
						: "not including subfolders"
				}`;
			} else {
				condition.valid = false;
				descEl.style.color = "var(--text-error)";
				descEl.textContent = "Error: Folder path must not be empty!";
			}
		};

		modal.onOpen = () => {
			const { contentEl } = modal;
			contentEl.empty();
			modal.setTitle("Folder condition");
			contentEl.createDiv({
				cls: "better-properties-modal-desc",
				text: "Looks for notes within a given folder.",
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
				.setName("Not within folder")
				.setDesc("Negates this condition to look for notes NOT in this folder.")
				.addToggle((cmp) =>
					cmp
						.setValue(condition.state.negated)
						.onChange((b) => (condition.state.negated = b))
				);

			new Setting(contentEl)
				.setName("Folder path")
				.setDesc("The path to the folder to look within.")
				.addSearch((cmp) => {
					cmp.setValue(condition.state.folderPath);
					cmp.onChange((v) => (condition.state.folderPath = v));
					new FolderSuggest(app, cmp);
				});

			new Setting(contentEl)
				.setName("Include subfolders")
				.setDesc(
					"Whether to include notes within subfolders which are nested within the selected folder."
				)
				.addToggle((cmp) =>
					cmp
						.setValue(condition.state.includeSubfolders)
						.onChange((b) => (condition.state.includeSubfolders = b))
				);

			modal.createFooterButton((cmp) =>
				cmp.setButtonText("close").onClick(() => modal.close())
			);
		};

		modal.open();
	},
};
