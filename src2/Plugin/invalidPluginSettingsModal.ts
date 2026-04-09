import { BP } from "#/lib/constants";
import { Modal } from "obsidian";
import { BetterProperties } from "./plugin";
import * as v from "valibot";

export class InvalidPluginSettingsModal extends Modal {
	constructor(
		public plugin: BetterProperties,
		public flattenedIssues: v.FlatErrors<undefined>
	) {
		super(plugin.app);
	}

	async onOpen(): Promise<void> {
		const { contentEl, flattenedIssues, renderIssueType } = this;
		this.setTitle(`${BP}: Invalid plugin settings`);
		contentEl.createEl("p", {
			text: `${BP} ran into the following issues when reading its settings:`,
		});

		Object.values(flattenedIssues).forEach(renderIssueType);

		contentEl.createEl("p", {
			text: "Please correct this immediately. Otherwise, your settings will be overwritten.",
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
