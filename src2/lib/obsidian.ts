import {
	App,
	MetadataTypeManager,
	setIcon,
	Setting,
	SettingGroup,
	TextAreaComponent,
} from "obsidian";
import "./obsidian.css";
import { BetterProperties } from "#/Plugin";
import { TryCatchResult } from "./utils";
import { text } from "#/i18n";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { obsidianText } from "~/i18next/obsidian";

/**
 * Adds an icon to the start of a Setting's name
 */
export const setSettingIcon = (setting: Setting, icon: string) => {
	const iconEl = window.createSpan({
		cls: "better-properties--setting-item-name-with-icon-icon",
	});
	setIcon(iconEl, icon);

	setting.nameEl.classList.add(
		"better-properties--setting-item-name-with-icon"
	);
	setting.nameEl.insertAdjacentElement("afterbegin", iconEl);
};

/**
 * Opens an external link in the default browser
 */
export const openLink = (href: string) => {
	const anchorEl = window.createEl("a", { href });
	anchorEl.click();
	anchorEl.remove();
};

/**
 * Creates a setting group with items for: docs link, export, import, and reset
 */
export const createActionsSettingsGroup = <T>({
	plugin,
	containerEl,
	documenationLink,
	onExport,
	validateImport,
	onImport,
	onReset,
}: {
	plugin: BetterProperties;
	containerEl: HTMLElement;
	documenationLink: string;
	onExport: () => void | Promise<void>;
	validateImport: (value: string) => TryCatchResult<T>;
	onImport: (data: T) => void | Promise<void>;
	onReset: () => void | Promise<void>;
}) => {
	new SettingGroup(containerEl)
		.addSetting((s) => {
			s.setName(text("common.documentation")).addButton((button) => {
				button
					.setIcon("lucide-book-open")
					.setTooltip(
						text("common.openDocumentation", { href: documenationLink })
					)
					.onClick(() => {
						openLink(documenationLink);
					});
			});
		})
		.addSetting((s) => {
			s.setName(text("common.export"))
				.setDesc(text("actionsSettingGroup.exportDesc"))
				.addButton((button) => {
					button.setIcon("lucide-arrow-up-to-line").onClick(async () => {
						await onExport();
					});
				});
		})
		.addSetting((s) => {
			s.setName(text("common.import"))
				.setDesc(text("actionsSettingGroup.importDesc"))
				.addButton((button) => {
					button.setIcon("lucide-arrow-down-to-line").onClick(async () => {
						const importModal = new ImportModal<T>(plugin.app);
						importModal.validate = (value) => validateImport(value);
						importModal.onImport = async (data) => await onImport(data);
						importModal.open();
					});
				});
		})
		.addSetting((s) => {
			s.setName(text("common.reset"))
				.setDesc(text("actionsSettingGroup.resetDesc"))
				.addButton((button) => {
					button
						.setIcon("lucide-rotate-ccw")
						.setWarning()
						.onClick(async () => {
							const confirmationmodal = new ConfirmationModal(plugin.app);
							confirmationmodal.onOpen = () => {
								confirmationmodal.setTitle(
									text("actionsSettingGroup.resetModal.title")
								);
								confirmationmodal.contentEl.createDiv({
									text: text("actionsSettingGroup.resetModal.desc"),
								});
								confirmationmodal
									.addFooterButton((button) => {
										button
											.setButtonText(obsidianText("dialogue.button-cancel"))
											.onClick(() => {
												confirmationmodal.close();
											});
									})
									.addFooterButton((button) => {
										button
											.setButtonText(text("common.reset"))
											.setWarning()
											.onClick(async () => {
												await onReset();
											});
									});
							};
							confirmationmodal.open();
						});
				});
		});
};

/**
 * Modal used for the import setting created by {@link createActionsSettingsGroup}
 */
class ImportModal<T> extends ConfirmationModal {
	constructor(app: App) {
		super(app);
	}

	validate: (value: string) => TryCatchResult<T> = () => ({
		success: false,
		error: "",
		data: undefined,
	});

	onImport: (data: T) => Promise<void> = async () => {};

	onOpen(): void | Promise<void> {
		this.setTitle(text("actionsSettingGroup.importModal.title"));

		const textArea = new TextAreaComponent(this.contentEl.createEl("p"));
		textArea.inputEl.setAttribute("cols", "40");
		textArea.inputEl.setAttribute("rows", "15");

		const validityEl = this.contentEl.createDiv();
		const updateValidityEl = (errorMsg?: string | DocumentFragment) => {
			validityEl.empty();
			validityEl.createDiv({
				text: errorMsg ? text("common.invalid") : text("common.valid"),
				cls: errorMsg ? "mod-warning" : "mod-success",
			});
			if (errorMsg) {
				validityEl.createDiv({ text: errorMsg });
			}
			validityEl.className = "";
		};

		this.addFooterButton((button) => {
			button.setButtonText(text("common.import")).setDisabled(true);

			textArea.onChange((value) => {
				const parsed = this.validate(value);
				if (!parsed.success) {
					button.setDisabled(true);
					updateValidityEl(parsed.error);
					return;
				}

				updateValidityEl();
				button.setDisabled(false);
				button.onClick(async () => {
					await this.onImport(parsed.data);
					this.close();
				});
			});
		});
	}
}

/**
 * Causes all properties of the given name to re-render
 */
export const triggerPropertyTypeChange = (
	metadataTypeManager: MetadataTypeManager,
	property: string
) => {
	metadataTypeManager.trigger("changed", property.toLowerCase());
};
