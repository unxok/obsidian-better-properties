import BetterProperties from "@/main";
import { Menu, MenuItem, Modal, Setting, TFile } from "obsidian";
import { ConfirmationModal } from "../ConfirmationModal";
import { text } from "@/i18Next";
import { PropertySuggest } from "../PropertySuggest";
import { FileSuggest } from "../FileSuggest";
import {
	conditionTypeOptions,
	defaultConditions,
	ToFileCondition,
} from "./Conditions";

export type SyncPropertiesModalForm = {
	fromFileType: "linked" | "selected";
	fromNoteLinkedProperty: string;
	fromFileSelectedPath: string;
	toFilesConditions: ToFileCondition[];
};

const defaultForm: SyncPropertiesModalForm = {
	fromFileType: "linked",
	fromNoteLinkedProperty: "",
	fromFileSelectedPath: "",
	toFilesConditions: [],
};

export class SyncPropertiesModal extends ConfirmationModal {
	public form: SyncPropertiesModalForm = { ...defaultForm };

	constructor(public plugin: BetterProperties, public activeFile?: TFile) {
		super(plugin.app);
	}

	updateForm<T extends keyof SyncPropertiesModalForm>(
		key: T,
		cb: (prev: SyncPropertiesModalForm[T]) => SyncPropertiesModalForm[T]
	) {
		const newForm = { ...this.form };
		newForm[key] = cb(newForm[key]);
		this.form = newForm;
	}

	onOpen(): void {
		const { contentEl, activeFile } = this;
		contentEl.empty();

		this.setTitle("Synchronize properties");

		const p = contentEl.createDiv({
			cls: "better-properties-sync-properties-modal-active-file-container",
		});
		p.createEl("b", { text: "Active note: " });
		p.createSpan({ text: activeFile?.path ?? "no active note" });

		new Setting(contentEl).setHeading().setName("From note");

		type FromFileType = {
			value: SyncPropertiesModalForm["fromFileType"];
			display: string;
			render: (container: HTMLElement) => void;
		};

		const fromFileTypeOptions: FromFileType[] = [
			{
				value: "linked",
				display: "Linked in active note",
				render: (container) => {
					new Setting(container)
						.setName("Property")
						.setDesc("The property which contains a link to a note")
						.addSearch((cmp) => {
							cmp.setPlaceholder("Property name");
							cmp.onChange((v) =>
								this.updateForm("fromNoteLinkedProperty", () => v)
							);
							const suggest = new PropertySuggest(this.app, cmp);
							if (activeFile) {
								suggest.scopeToFile(activeFile);
							}
						});
				},
			},
			{
				value: "selected",
				display: "Select a note",
				render: (container) => {
					new Setting(container)
						.setName("File path")
						.setDesc("Select a note from a dropdown to get the file path.")
						.addSearch((cmp) => {
							cmp.setPlaceholder("File path");
							cmp.onChange((v) =>
								this.updateForm("fromFileSelectedPath", () => v)
							);
							new FileSuggest(this.app, cmp);
						});
				},
			},
		];

		new Setting(contentEl)
			.setName("Type")
			.setDesc("How the note will be determined")
			.addDropdown((cmp) => {
				fromFileTypeOptions.forEach(({ value, display }) =>
					cmp.addOption(value, display)
				);
				cmp.then(() => {
					const container = contentEl.createDiv();
					container.createDiv(); // so borders for settings don't get messed up
					const findRenderer = (v: string) => {
						const found = fromFileTypeOptions.find(({ value }) => v === value);
						if (!found) return;
						container.empty();
						container.createDiv(); // so borders for settings don't get messed up
						found.render(container);
					};
					cmp.onChange(findRenderer);
					cmp.setValue(this.form.fromFileType);
					findRenderer(cmp.getValue());
				});
			});

		new Setting(contentEl).setHeading().setName("To notes conditions");

		const conditionsContainer = contentEl.createDiv().createEl("ol");
		conditionsContainer.createDiv(); // so borders for settings don't get messed up

		const onClickConditionMenuItem = ({
			value,
			display,
			icon,
			renderer,
		}: (typeof conditionTypeOptions)[number]) => {
			const index = this.form.toFilesConditions.length;
			const rowEl = conditionsContainer.createEl("li");
			const s = new Setting(rowEl).setName(display);
			const condition = defaultConditions[value];
			this.form.toFilesConditions.push(condition);
			const doRender = () =>
				// TODO typescript weirdness
				renderer(this.app, s.descEl, condition as never);
			if (value !== "activeFile") {
				s.addExtraButton((cmp) => cmp.setIcon("edit").onClick(doRender));
			}

			s.addExtraButton((cmp) =>
				cmp.setIcon("trash").onClick(() => {
					rowEl.remove();
					this.form.toFilesConditions = this.form.toFilesConditions.filter(
						(_, i) => i !== index
					);
				})
			);
			doRender();
		};
		new Setting(contentEl)
			.addButton((cmp) =>
				cmp
					.setButtonText("new condition")
					.setCta()
					.onClick((e) => {
						const m = new Menu();
						conditionTypeOptions.forEach((op) =>
							m.addItem((item) =>
								item
									.setTitle(op.display)
									.setIcon(op.icon)
									.onClick(() => onClickConditionMenuItem(op))
							)
						);
						m.showAtMouseEvent(e);
					})
			)
			.then((s) => {
				s.infoEl.remove();
			});

		this.createFooterButton((cmp) =>
			cmp.setButtonText("view form data").onClick(() => {
				const json = JSON.stringify(this.form, undefined, 2);
				const modal = new Modal(this.app);
				modal.onOpen = () => {
					modal.contentEl.empty();
					modal.setTitle("Form data");
					modal.contentEl
						.createEl("p")
						.createEl("pre")
						.createEl("code", { text: json });
				};
				modal.open();
			})
		);
		this.createFooterButton((cmp) => cmp.setButtonText("cancel"));
		this.createFooterButton((cmp) =>
			cmp
				.setButtonText("synchronize")
				.setCta()
				.onClick(() => {
					const {
						toFilesConditions,
						fromFileType,
						fromFileSelectedPath,
						fromNoteLinkedProperty,
					} = this.form;
					const isFormInvalid =
						toFilesConditions.some(({ valid }) => !valid) ||
						(fromFileType === "linked" && !fromNoteLinkedProperty) ||
						(fromFileType === "selected" && !fromFileSelectedPath);
					if (isFormInvalid) {
						new Notice(
							"One or more errors found! Please correct and try again."
						);
						return;
					}
				})
		);
	}
}
