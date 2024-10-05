import {
	AbstractInputSuggest,
	App,
	DropdownComponent,
	SearchComponent,
	Setting,
	TFile,
} from "obsidian";
import {
	defaultPropertySettings,
	PropertySettings,
} from "@/libs/PropertySettings";
import BetterProperties from "@/main";
import { CustomTypeWidget } from "..";
import { arrayMove } from "@/libs/utils/pure";
import { createSection } from "@/libs/utils/setting";

export const DropdownWidget: CustomTypeWidget = {
	type: "dropdown",
	icon: "chevron-down-circle",
	default: () => "",
	name: () => "Dropdown",
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, data, ctx) => {
		const { options, dynamicFileJs, dynamicInlineJs } = plugin.settings
			.propertySettings[data.key.toLowerCase()]?.["dropdown"] ?? {
			...defaultPropertySettings["dropdown"],
		};

		const container = el.createDiv({
			cls: "metadata-input-longtext",
		});

		const dropdown = new DropdownComponent(container)
			// .addOptions(optionsObj)
			.setValue(data.value?.toString() ?? "")
			.onChange((v) => ctx.onChange(v));

		(async () => {
			const staticOptionsObj = options.reduce((acc, { label, value }) => {
				acc[value] = label;
				return acc;
			}, {} as Record<string, string>);

			const optionsObjWithInline = getDynamicOptionsInline(
				dynamicInlineJs,
				staticOptionsObj
			);

			const optionsObj = await getDynamicOptionsFile(
				dynamicFileJs,
				optionsObjWithInline,
				plugin
			);

			dropdown.addOptions(optionsObj);
		})();
	},
};

const getDynamicOptionsInline = (
	inlineJs: string,
	obj: Record<string, string>
) => {
	if (!inlineJs) return obj;
	try {
		const dynamicArr: { label: string; value: string }[] = eval(
			`(() => {${inlineJs}})()`
		);
		if (!Array.isArray(dynamicArr)) throw new Error();
		return dynamicArr.reduce(
			(acc, { label, value }) => {
				acc[value] = label;
				return acc;
			},
			{ ...obj }
		);
	} catch (e) {
		const msg =
			"Better Properties: Failed to load dynamic options. Check dev console for more details.";
		new Notice(msg);
		console.error(e);
		return obj;
	}
};

const getDynamicOptionsFile = async (
	filePath: string,
	obj: Record<string, string>,
	plugin: BetterProperties
) => {
	if (!filePath || !filePath?.toLowerCase()?.endsWith(".js")) return obj;
	const file = plugin.app.vault.getFileByPath(filePath);
	if (!file) {
		new Notice(
			"Better Properties: Could not locate JS file from " + filePath
		);
		return obj;
	}
	const inlineJs = await plugin.app.vault.cachedRead(file);
	return getDynamicOptionsInline(inlineJs, obj);
};

export const createDropdownSettings = (
	el: HTMLElement,
	form: PropertySettings["dropdown"],
	updateForm: <T extends keyof PropertySettings["dropdown"]>(
		key: T,
		value: PropertySettings["dropdown"][T]
	) => void,
	plugin: BetterProperties
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
