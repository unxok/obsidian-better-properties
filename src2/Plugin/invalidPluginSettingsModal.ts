import { Modal } from "obsidian";
import { BetterProperties } from "./plugin";
import * as v from "valibot";
import { t } from "#/i18n";

export class InvalidPluginSettingsModal extends Modal {
	constructor(
		public plugin: BetterProperties,
		public flattenedIssues: v.FlatErrors<undefined>
	) {
		super(plugin.app);
	}

	async onOpen(): Promise<void> {
		const { contentEl, flattenedIssues, renderIssueType } = this;
		this.setTitle(t("InvalidPluginSettingsModal.title"));
		contentEl.createEl("p", {
			text: t("InvalidPluginSettingsModal.desc"),
		});

		Object.values(flattenedIssues).forEach(renderIssueType);

		contentEl.createEl("p", {
			text: t("InvalidPluginSettingsModal.instruction"),
			cls: "mod-warning",
		});
	}

	renderIssueType = (
		issueType: (typeof this.flattenedIssues)[keyof typeof this.flattenedIssues]
	): void => {
		const listEl = this.contentEl.createEl("ul");
		if (!issueType) return;
		if (Array.isArray(issueType)) {
			issueType.forEach((text) => {
				listEl.createEl("li", { text });
			});
			return;
		}
		Object.entries(issueType).forEach(([key, value]) => {
			listEl.createEl("li", {}, (listEl) => {
				listEl.createEl("b", { text: key });
			});
			if (!value) return;
			if (typeof value === "string") {
				listEl.createEl("li", { text: value });
				return;
			}
			const subListEl = listEl.createEl("ul");
			value.forEach((text) => {
				subListEl.createEl("li", { text });
			});
		});
	};
}
