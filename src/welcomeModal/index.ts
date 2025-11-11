import { ButtonComponent, Component, MarkdownRenderer } from "obsidian";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { text } from "~/i18next";
import { obsidianText } from "~/i18next/obsidian";
import BetterProperties from "~/main";

// TODO replace text strings with localizations

export class WelcomeModal extends ConfirmationModal {
	canClose: boolean = false;

	constructor(public plugin: BetterProperties) {
		super(plugin.app);
	}

	close(): void {
		if (!this.canClose) return;
		super.close();
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.modalEl.querySelector(".modal-close-button")?.remove();

		this.setTitle(text("welcomeMessageModal.title"));

		MarkdownRenderer.render(
			this.app,
			text("welcomeMessageModal.content"),
			contentEl.createDiv(),
			"",
			new Component()
		);

		let closeButton: ButtonComponent | null = null;

		this.setFooterCheckbox((checkbox) =>
			checkbox
				.setLabel(text("welcomeMessageModal.checkboxLabel"))
				.onChange((b) => {
					if (!closeButton) return;
					closeButton.setDisabled(!b);
				})
		);

		this.addFooterButton((btn) => {
			closeButton = btn;
			btn
				.setDisabled(true)
				.setCta()
				.setButtonText(obsidianText("interface.menu.close"))
				.onClick(() => {
					this.canClose = true;
					this.close();
					this.plugin.updateSettings((s) => ({ ...s, hideWelcomeModal: true }));
				});
		});
	}
}
