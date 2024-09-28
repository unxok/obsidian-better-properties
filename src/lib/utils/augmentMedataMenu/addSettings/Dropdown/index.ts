import { ButtonComponent, setIcon, Setting } from "obsidian";
import { createSection } from "src/lib/utils/setting";
import { PropertySettings } from "..";
import { arrayMove } from "src/lib/utils/pure";

export const createDropdownSettings = (
	el: HTMLElement,
	form: PropertySettings["dropdown"],
	updateForm: <T extends keyof PropertySettings["dropdown"]>(
		key: T,
		value: PropertySettings["dropdown"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Dropdown", true);

	const updateOptions = (
		cb: (prev: (typeof form)["options"]) => (typeof form)["options"]
	) => {
		const newOpts = cb([...form.options]);
		updateForm("options", newOpts);
	};

	new Setting(content)
		.setHeading()
		.setName("Options")
		.setDesc(
			"Manage the available options for this dropdown. Value on the left will be what's saved to your note, and the Label on the right is what will be shown in the dropdown."
		);

	const optionContainer = content.createDiv();

	const renderOptions = () => {
		optionContainer.empty();
		form.options.forEach(({ label, value }, index) =>
			createOption(
				optionContainer,
				updateOptions,
				renderOptions,
				label,
				value,
				index
			)
		);
	};

	renderOptions();

	new Setting(content).addButton((cmp) =>
		cmp
			.setCta()
			.setIcon("plus")
			.onClick(() => {
				const newOpts = [...form.options];
				const newLen = newOpts.push({ label: "", value: "" });
				createOption(
					optionContainer,
					updateOptions,
					renderOptions,
					"",
					"",
					newLen - 1
				);
				updateForm("options", newOpts);
			})
	);
};

const createOption = (
	container: HTMLElement,
	updateOptions: (
		cb: (
			prev: PropertySettings["dropdown"]["options"]
		) => PropertySettings["dropdown"]["options"]
	) => void,
	renderOptions: () => void,
	label: string,
	value: string,
	index: number
) => {
	const setting = new Setting(container);

	// const btnContainer = setting.controlEl.createDiv({
	// 	attr: {
	// 		style: "display: inline-flex; flex-direction: column; justify-content: center; align-items: center;",
	// 	},
	// });
	// const upBtn = btnContainer.createDiv({
	// 	cls: "clickable-icon extra-setting-button",
	// });
	// setIcon(upBtn, "chevron-up");
	// upBtn.addEventListener("click", () => {
	// 	if (index === 0) return;
	// 	updateOptions((prev) => {
	// 		const newArr = arrayMove(prev, index, index - 1);
	// 		return newArr;
	// 	});
	// 	renderOptions();
	// });
	// const downBtn = btnContainer.createDiv({
	// 	cls: "clickable-icon extra-setting-button",
	// });
	// setIcon(downBtn, "chevron-down");
	// downBtn.addEventListener("click", () => {
	// 	updateOptions((prev) => {
	// 		if (prev.length === index + 1) return prev;
	// 		const newArr = arrayMove(prev, index, index + 1);
	// 		return newArr;
	// 	});
	// 	renderOptions();
	// });
	// .addExtraButton((cmp) =>
	// 	cmp.setIcon("chevron-up").onClick(() => {
	// 		if (index === 0) return;
	// 		updateOptions((prev) => {
	// 			const newArr = arrayMove(prev, index, index - 1);
	// 			return newArr;
	// 		});
	// 		renderOptions();
	// 	})
	// )
	// .addExtraButton((cmp) =>
	// 	cmp.setIcon("chevron-down").onClick(() => {
	// 		updateOptions((prev) => {
	// 			if (prev.length === index + 1) return prev;
	// 			const newArr = arrayMove(prev, index, index + 1);
	// 			return newArr;
	// 		});
	// 		renderOptions();
	// 	})
	// )

	setting
		.addText((cmp) =>
			cmp
				.setPlaceholder("Value")
				.setValue(value)
				.onChange((v) => {
					updateOptions((prev) => {
						prev[index].value = v;
						return prev;
					});
				})
				.then((c) => c.inputEl.setAttribute("aria-label", "Value"))
		)
		.addText((cmp) =>
			cmp
				.setPlaceholder("Label")
				.setValue(label)
				.onChange((v) => {
					updateOptions((prev) => {
						prev[index].label = v;
						return prev;
					});
				})
				.then((c) => c.inputEl.setAttribute("aria-label", "Label"))
		)
		.addExtraButton((cmp) =>
			cmp.setIcon("chevron-up").onClick(() => {
				if (index === 0) return;
				updateOptions((prev) => {
					const newArr = arrayMove(prev, index, index - 1);
					return newArr;
				});
				renderOptions();
			})
		)
		.addExtraButton((cmp) =>
			cmp.setIcon("chevron-down").onClick(() => {
				updateOptions((prev) => {
					if (prev.length === index + 1) return prev;
					const newArr = arrayMove(prev, index, index + 1);
					return newArr;
				});
				renderOptions();
			})
		)
		.addExtraButton((cmp) =>
			cmp.setIcon("x").onClick(() => {
				setting.settingEl.remove();
				updateOptions((prev) => {
					const arr = prev.filter((_, i) => i !== index);
					return arr;
				});
				renderOptions();
			})
		);
};
