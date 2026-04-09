import { ToggleComponent } from "obsidian";
import { CustomPropertyType } from "../../types";

export default (({ containerEl, data, context }) => {
	const value = !!data;
	const cmp = new ToggleComponent(
		containerEl.createDiv({
			cls: "better-properties--toggle-widget-container",
		})
	)
		.setValue(value)
		.onChange((b) => context.onChange(b));
	return {
		focus() {
			cmp.toggleEl.focus();
		},
	};
}) satisfies CustomPropertyType["renderWidget"];
