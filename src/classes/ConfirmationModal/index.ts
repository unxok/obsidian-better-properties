import { App, ButtonComponent, Modal } from "obsidian";

export class ConfirmationModal extends Modal {
	buttonContainer!: HTMLDivElement;
	constructor(app: App) {
		super(app);
		this.createButtonContainer();
	}

	createButtonContainer(): HTMLDivElement {
		return (this.buttonContainer = this.contentEl.createDiv({
			cls: "modal-button-container",
		}));
	}

	createCheckBox(options: {
		text?: string;
		defaultChecked?: boolean;
		onChange?: (b: boolean) => void | Promise<void>;
	}): this {
		const {
			text = "",
			defaultChecked = false,
			onChange = () => {},
		} = options;
		const { buttonContainer } = this;
		const input = buttonContainer
			.createEl("label", { cls: "mod-checkbox" })
			.createEl("input", {
				attr: {
					tabindex: "-1",
					type: "checkbox",
					checked: defaultChecked || null,
				},
			});
		input.insertAdjacentText("afterend", text);
		input.addEventListener("click", async (e) => {
			const b = (e.currentTarget as EventTarget & HTMLInputElement)
				.checked;
			await onChange(b);
		});

		return this;
	}

	createFooterButton(cb: (cmp: ButtonComponent) => void): this {
		const cmp = new ButtonComponent(this.buttonContainer);
		cb(cmp);
		return this;
	}
}
