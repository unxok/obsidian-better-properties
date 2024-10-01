import {
	AbstractInputSuggest,
	App,
	ButtonComponent,
	SearchComponent,
	setIcon,
	Setting,
	TFile,
} from "obsidian";
import { createSection } from "@/libs/utils/setting";
import { PropertySettings } from "..";
import { arrayMove } from "@/libs/utils/pure";
import PropertiesPlusPlus from "@/main";

export const createDropdownSettings = (
	el: HTMLElement,
	form: PropertySettings["dropdown"],
	updateForm: <T extends keyof PropertySettings["dropdown"]>(
		key: T,
		value: PropertySettings["dropdown"][T]
	) => void,
	plugin: PropertiesPlusPlus
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

	new Setting(content)
		.setHeading()
		.setName("Dynamic options")
		.setDesc(
			"Use JavaScript to dynamically generate options for this dropdown in addition to the ones listed above. You can either type your code here and/or specify a .js file. Your code should, at the top level, return an array of objects with a key for label and value which are both strings ({value: string; label: string}[])."
		);

	new Setting(content).setName("Inline JavaScript").addTextArea((cmp) =>
		cmp
			.setPlaceholder(
				'return [{value: "a", label: "Apples"}, {value: "b", label: "Bananas"}]'
			)
			.setValue(form.dynamicInlineJs)
			.onChange((v) => updateForm("dynamicInlineJs", v))
			.then((cmp) => {
				cmp.inputEl.setAttribute("rows", "4");
			})
	);

	new Setting(content).setName("Load from *.js file").addSearch((cmp) => {
		cmp.setPlaceholder("path/to/file.js")
			.setValue(form.dynamicFileJs)
			.onChange((v) => updateForm("dynamicFileJs", v));
		new JsSuggest(plugin.app, cmp);
	});
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

class JsSuggest extends AbstractInputSuggest<TFile> {
	searchCmp: SearchComponent;
	constructor(app: App, searchCmp: SearchComponent) {
		super(app, searchCmp.inputEl);
		this.searchCmp = searchCmp;
	}

	protected getSuggestions(query: string): TFile[] | Promise<TFile[]> {
		const allFiles = this.app.vault.getFiles();
		const jsFiles = allFiles
			.filter((f) => f.extension.toLowerCase() === "js")
			.toSorted((a, b) => b.path.localeCompare(a.path));
		if (!query) return jsFiles;
		const filtered = jsFiles.filter((f) => f.path.includes(query));
		return filtered;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.classList.add("mod-complex");
		const contentEl = el.createDiv({ cls: "suggestion-content" });
		contentEl.createDiv({ cls: "suggestion-title", text: file.name });
		contentEl.createDiv({ cls: "suggestion-note", text: file.path });
	}

	selectSuggestion(file: TFile, _: MouseEvent | KeyboardEvent): void {
		this.searchCmp.setValue(file.path);
		this.searchCmp.onChanged();
		this.close();
	}
}
