import { Setting } from "obsidian";
import { createSection } from "@/libs/utils/setting";
import { PropertySettings } from "..";

export const createNumberPlusPlusSettings = (
	el: HTMLElement,
	form: PropertySettings["number-plus-plus"],
	updateForm: <T extends keyof PropertySettings["number-plus-plus"]>(
		key: T,
		value: PropertySettings["number-plus-plus"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Number++", true);

	new Setting(content)
		.setName("Validate within bounds")
		.setDesc(
			"If on, the number will be validated against the set min and max values prior to saving."
		)
		.addToggle((cmp) =>
			cmp
				.setValue(form.validate)
				.onChange((b) => updateForm("validate", b))
		);

	new Setting(content)
		.setName("Min")
		.setDesc(
			"If the validate toggle is on, this is the minimum number allowed for the input."
		)
		.addText((cmp) =>
			cmp.setValue(form.min.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("min", num);
			})
		);

	new Setting(content)
		.setName("Max")
		.setDesc(
			"Will affect the width of the input. If the validate toggle is on, this is the minimum number allowed for the input."
		)
		.addText((cmp) =>
			cmp.setValue(form.max.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("max", num);
			})
		);

	new Setting(content)
		.setName("Step")
		.setDesc(
			"The amount to input will be changed if the plus or minus buttons are clicked."
		)
		.addText((cmp) =>
			cmp.setValue(form.step.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("step", num);
			})
		);
};
