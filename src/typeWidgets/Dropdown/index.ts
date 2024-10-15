import {
	AbstractInputSuggest,
	App,
	DropdownComponent,
	Keymap,
	SearchComponent,
	setIcon,
	Setting,
	TFile,
} from "obsidian";
import {
	defaultPropertySettings,
	PropertySettings,
} from "@/libs/PropertySettings";
import BetterProperties from "@/main";
import { CustomTypeWidget } from "..";
import { arrayMove, dangerousEval } from "@/libs/utils/pure";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/libs/i18Next";

export const DropdownWidget: CustomTypeWidget = {
	type: "dropdown",
	icon: "chevron-down-circle",
	default: () => "",
	name: () => text("typeWidgets.dropdown.name"),
	validate: (v) => typeof v?.toString() === "string",
	render: (plugin, el, data, ctx) => {
		const { options, dynamicFileJs, dynamicInlineJs } = plugin.settings
			.propertySettings[data.key.toLowerCase()]?.["dropdown"] ?? {
			...defaultPropertySettings["dropdown"],
		};

		// const container = el.createDiv({
		// 	cls: "metadata-input-longtext better-properties-dropdown-container",
		// });
		const container = el;

		const dropdown = new DropdownComponent(container);

		const linkButton = container.createSpan({
			cls: "clickable-icon",
			attr: {
				"aria-label": text("typeWidgets.dropdown.openNoteTooltip"),
			},
		});

		const updateLinkButton = (dropdownValue: string) => {
			if (
				dropdownValue.startsWith("[[") &&
				dropdownValue.endsWith("]]")
			) {
				const linkText = dropdownValue.slice(2, -2);
				const withoutPipe = (() => {
					let pipe = -1;
					while ((pipe = linkText.indexOf("|", pipe + 1)) >= 0) {
						if (pipe > 0 && linkText[pipe - 1] == "\\") continue;
						return linkText.substring(0, pipe);
					}
					return linkText.replace(/\\\|/g, "|");
				})();
				linkButton.style.setProperty("display", "flex");
				linkButton.onclick = async (e) => {
					const paneType = Keymap.isModEvent(e);
					await plugin.app.workspace.openLinkText(
						withoutPipe,
						"",
						paneType
					);
				};
				return;
			}
			linkButton.style.setProperty("display", "none");
			linkButton.onclick = () => {};
		};

		setIcon(linkButton, "link");
		updateLinkButton(data.value?.toString() ?? "");

		dropdown.onChange((v) => {
			ctx.onChange(v);
			updateLinkButton(v);
		});

		(async () => {
			const staticOptionsObj = options.reduce((acc, { label, value }) => {
				acc[value] = label || value;
				return acc;
			}, {} as Record<string, string>);

			const optionsObjWithInline = await getDynamicOptionsInline(
				dynamicInlineJs,
				staticOptionsObj
			);

			const optionsObj = await getDynamicOptionsFile(
				dynamicFileJs,
				optionsObjWithInline,
				plugin
			);

			dropdown
				.addOptions(optionsObj)
				.setValue(data.value?.toString() ?? "");
		})();
	},
};

const getDynamicOptionsInline = async (
	inlineJs: string,
	obj: Record<string, string>
) => {
	if (!inlineJs) return obj;
	try {
		const func = dangerousEval(
			`async () => {${inlineJs}}`
		) as () => Promise<{ label: string; value: string }[]>;
		const dynamicArr = await func();
		if (!Array.isArray(dynamicArr)) throw new Error();
		return dynamicArr.reduce(
			(acc, { label, value }) => {
				acc[value] = label;
				return acc;
			},
			{ ...obj }
		);
	} catch (e) {
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
		new Notice(text("notices.couldntLocateJsFile", { filePath }));
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
	const { content } = createSection(
		el,
		text("typeWidgets.dropdown.name"),
		true
	);

	const updateOptions = (
		cb: (prev: (typeof form)["options"]) => (typeof form)["options"]
	) => {
		const newOpts = cb([...form.options]);
		updateForm("options", newOpts);
	};

	new Setting(content)
		.setHeading()
		.setName(text("typeWidgets.dropdown.settings.options.title"))
		.setDesc(text("typeWidgets.dropdown.settings.options.desc"));

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
		.setName(text("typeWidgets.dropdown.settings.dynamicOptions.title"))
		.setDesc(text("typeWidgets.dropdown.settings.dynamicOptions.desc"));

	new Setting(content)
		.setName(
			text("typeWidgets.dropdown.settings.dynamicOptions.inlineJs.title")
		)
		.addTextArea((cmp) =>
			cmp
				.setPlaceholder(
					text(
						"typeWidgets.dropdown.settings.dynamicOptions.inlineJs.placeholder"
					)
				)
				.setValue(form.dynamicInlineJs)
				.onChange((v) => updateForm("dynamicInlineJs", v))
				.then((cmp) => {
					cmp.inputEl.setAttribute("rows", "4");
				})
		);

	new Setting(content)
		.setName(
			text("typeWidgets.dropdown.settings.dynamicOptions.fileJs.title")
		)
		.addSearch((cmp) => {
			cmp.setPlaceholder(
				text(
					"typeWidgets.dropdown.settings.dynamicOptions.fileJs.placeholder"
				)
			)
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
				.setPlaceholder(
					text("typeWidgets.dropdown.createOption.value.placeholder")
				)
				.setValue(value)
				.onChange((v) => {
					updateOptions((prev) => {
						prev[index].value = v;
						return prev;
					});
				})
				.then((c) =>
					c.inputEl.setAttribute(
						"aria-label",
						text("typeWidgets.dropdown.createOption.value.tooltip")
					)
				)
		)
		.addText((cmp) =>
			cmp
				.setPlaceholder(
					text("typeWidgets.dropdown.createOption.label.placeholder")
				)
				.setValue(label)
				.onChange((v) => {
					updateOptions((prev) => {
						const label = v ? v : prev[index].value;
						prev[index].label = label;
						return prev;
					});
				})
				.then((c) =>
					c.inputEl.setAttribute(
						"aria-label",
						text("typeWidgets.dropdown.createOption.label.tooltip")
					)
				)
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("chevron-up")
				.onClick(() => {
					if (index === 0) return;
					updateOptions((prev) => {
						const newArr = arrayMove(prev, index, index - 1);
						return newArr;
					});
					renderOptions();
				})
				.setTooltip(
					text("typeWidgets.dropdown.createOption.moveUpTooltip")
				)
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("chevron-down")
				.onClick(() => {
					updateOptions((prev) => {
						if (prev.length === index + 1) return prev;
						const newArr = arrayMove(prev, index, index + 1);
						return newArr;
					});
					renderOptions();
				})
				.setTooltip(
					text("typeWidgets.dropdown.createOption.moveDownTooltip")
				)
		)
		.addExtraButton((cmp) =>
			cmp
				.setIcon("x")
				.onClick(() => {
					setting.settingEl.remove();
					updateOptions((prev) => {
						const arr = prev.filter((_, i) => i !== index);
						return arr;
					});
					renderOptions();
				})
				.setTooltip(
					text("typeWidgets.dropdown.createOption.removeTooltip")
				)
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
