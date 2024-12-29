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

const updateSettingText = (setting: Setting, condition: FolderCondition) => {
	const { importance, negated, folderPath, includeSubfolders } =
		condition.state;
	const { nameEl, descEl } = setting;

	if (!folderPath) {
		condition.valid = false;
		descEl.style.color = "var(--text-error)";
		nameEl.textContent = "Folder: ???";
		descEl.textContent = "Error: Folder path must not be empty!";
		return;
	}

	condition.valid = true;
	descEl.style.removeProperty("color");

	nameEl.textContent = "Folder: " + folderPath;

	const stateText = {
		/* importance: conditionImportanceTypeDetails.find(
			([v]) => v === importance
		)![1], */
		negated: negated ? "Not in folder" : "In folder",
		includeSubfolders: includeSubfolders
			? "including subfolders"
			: "not including subfolders",
	};
	descEl.textContent = Object.values(stateText).join(", ");
};

export const folderConditionOption: ConditionTypeOption<FolderCondition> = {
	value: "folder",
	display: "Folder",
	icon: "folder",
	renderer: (app, setting, condition) => {
		const modal = new ConfirmationModal(app);

		modal.onClose = () => {
			updateSettingText(setting, condition);
		};

		modal.onOpen = () => {
			const { contentEl } = modal;
			contentEl.empty();
			modal.setTitle("Folder condition");
			contentEl.createDiv({
				cls: "better-properties-modal-desc",
				text: "Looks for notes within a given folder.",
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
