import { SettingGroup, ToggleComponent } from "obsidian";
import "./index.css";

export class ToggleableSettingGroup extends SettingGroup {
	enabledToggle: ToggleComponent;

	constructor(containerEl: HTMLElement) {
		super(containerEl);

		containerEl.classList.add("better-properties--toggleable-settings-group");

		this.enabledToggle = new ToggleComponent(this.controlEl).onChange((b) => {
			this.onEnabledChangeCallback(b);
			this.setDisabled(!b);
		});
	}

	then(cb: (group: ToggleableSettingGroup) => void): ToggleableSettingGroup {
		cb(this);
		return this;
	}

	private onEnabledChangeCallback: (isEnabled: boolean) => void = () => {};
	onEnabledChange(cb: (isEnabled: boolean) => void): this {
		this.onEnabledChangeCallback = cb;
		return this;
	}

	setDisabled(isDisabled: boolean): void {
		const { listEl } = this;

		this.enabledToggle.setValue(!isDisabled);
		listEl.setAttribute("disabled", isDisabled.toString());
		listEl.setAttribute(
			"data-better-properties--disabled",
			isDisabled.toString()
		);
	}
}
