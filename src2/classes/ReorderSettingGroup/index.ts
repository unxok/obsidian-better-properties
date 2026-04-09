import { Setting, SettingGroup } from "obsidian";
import "./index.css";

export class ReorderSettingGroup extends SettingGroup {
	constructor(containerEl: HTMLElement) {
		super(containerEl);
	}

	draggingIndex: number = -1;
	draggedOverIndex: number = -1;
	removeDragIndicator: () => void = () => {};

	onReorderCallback: (from: number, to: number) => void | Promise<void> =
		() => {};
	onReorder(cb: (from: number, to: number) => void | Promise<void>): this {
		this.onReorderCallback = cb;
		return this;
	}

	override addSetting(cb: (setting: Setting) => void): this {
		super.addSetting((setting) => {
			const { settingEl } = setting;

			const index = settingEl.parentElement?.indexOf(settingEl) ?? -1;

			settingEl.classList.add("better-properties--reorder-setting-group-item");

			settingEl.addEventListener("dragover", (e) => {
				if (!(e instanceof DragEvent)) return;

				this.removeDragIndicator();
				this.draggedOverIndex = index;

				if (index === this.draggingIndex) return;

				// indicator already set
				if (settingEl.getAttribute("data-better-properties--drag-indicator"))
					return;

				settingEl.setAttribute(
					"data-better-properties--drag-indicator",
					index > this.draggingIndex ? "bottom" : "top"
				);
				this.removeDragIndicator = () =>
					settingEl.removeAttribute("data-better-properties--drag-indicator");
			});

			setting.addExtraButton((button) => {
				setting.settingEl.insertAdjacentElement(
					"afterbegin",
					button.extraSettingsEl
				);
				button.setIcon("lucide-grip-vertical");
				const { extraSettingsEl } = button;
				extraSettingsEl.setAttribute("draggable", "true");
				extraSettingsEl.addEventListener("dragstart", (e) => {
					if (!(e instanceof DragEvent)) return;
					e.dataTransfer?.setDragImage(window.createDiv(), 0, 0);
					this.draggingIndex = index;
				});
				extraSettingsEl.addEventListener("dragend", async () => {
					await this.onReorderCallback(
						this.draggingIndex,
						this.draggedOverIndex
					);
				});
			});

			cb(setting);
		});

		return this;
	}
}
