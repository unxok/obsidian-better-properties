import { ToggleComponent } from "obsidian";
import CustomPropertyType from "./type";

export default (() => ({
	icon: "toggle-left",
	name: () => "Toggle",
	render: (containerEl, data, context) => {
		const value = !!data;
		const cmp = new ToggleComponent(containerEl)
			.setValue(value)
			.onChange((b) => context.onChange(b));
		return {
			focus() {
				cmp.toggleEl.focus();
			},
		};
	},
	validate: (v) => typeof v === "boolean",
})) satisfies CustomPropertyType["getWidget"];
