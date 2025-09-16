import {
	DropdownComponent,
	ExtraButtonComponent,
	Keymap,
	MenuItem,
	TFile,
} from "obsidian";
import { CustomPropertyType, PropertySettings } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import {
	getAllTags,
	getFirstLinkPathDest,
	iterateFileMetadata,
} from "~/lib/utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";
import { selectColors } from "~/lib/constants";
import { ComboboxComponent, SearchableMenu } from "~/classes/ComboboxComponent";
import { Icon } from "~/lib/types/icons";

type Settings = NonNullable<PropertySettings["select"]>;
type Option = NonNullable<Settings["manualOptions"]>[number];

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new SelectTypeComponent(plugin, el, value, ctx);
};

class SelectTypeComponent extends PropertyWidgetComponentNew<"select", string> {
	type = "select" as const;
	parseValue = (v: unknown) => v?.toString() ?? "";

	component: Select | DropdownComponent;
	auxEl: HTMLElement | undefined;
	options: Option[] = [];

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();
		this.component = settings?.useDefaultStyle
			? new DropdownComponent(el)
			: new Select(plugin, el, ctx.key, !!settings?.manualAllowCreate);
		this.initOptions();

		const parsed = this.parseValue(value);
		this.component.setValue(parsed);
		this.component.onChange((v) => {
			this.setValue(v);
			this.renderAux();
		});

		this.onFocus = () => {
			// this.component.selectEl.focus();
			console.log("focus");
			this.component.selectEl.click();
		};

		if (!(value === "" && this.component instanceof DropdownComponent)) return;

		// native <select> will not render normally when value is set to empty string
		const defaultOption =
			this.component.selectEl.querySelector('option[value=""]');
		if (!defaultOption) return;
		defaultOption.setAttribute("selected", "true");
	}

	validateOption(value: string): boolean {
		if (!value) return true;
		return !!this.options.find((o) => o.value === value);
	}

	renderAux(): void {
		const { auxEl, plugin, ctx, component, containerEl } = this;
		if (auxEl) {
			auxEl.remove();
		}

		const value = component.getValue();
		const file = getFirstLinkPathDest(
			plugin.app.metadataCache,
			ctx.sourcePath,
			value
		);
		const auxType: "invalid" | "wikilink" | "other" /*TODO add external link*/ =
			!this.validateOption(value)
				? "invalid"
				: value.startsWith("[[") && value.endsWith("]]")
				? "wikilink"
				: "other";

		if (auxType === "other") return;

		const button = new ExtraButtonComponent(containerEl)
			.setIcon(auxType === "invalid" ? "lucide-alert-circle" : "link")
			.setTooltip(
				auxType === "invalid"
					? `Invalid value: "${value}"`
					: file
					? text("common.openFile", { fileName: file.name })
					: obsidianText("plugins.page-preview.label-empty-note")
			);
		this.auxEl = button.extraSettingsEl;

		button.extraSettingsEl.classList.add("better-properties-select-aux");
		if (auxType === "invalid") {
			button.extraSettingsEl.classList.add("better-properties-mod-error");
		}

		if (auxType !== "wikilink") return;

		const fileName = file?.basename ?? value.slice(2, -2);
		button.extraSettingsEl.addEventListener("click", (e) => {
			this.plugin.app.workspace.openLinkText(
				fileName,
				ctx.sourcePath,
				Keymap.isModEvent(e)
			);
		});
	}

	getValue(): string {
		return this.component.getValue();
	}

	setValue(value: unknown): void {
		if (this.component.getValue() !== value) {
			this.component.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}

	addOptions(options: Option[]): void {
		if (this.component instanceof Select) {
			this.component.addOptions(options);
			return;
		}
		this.component.addOptions(
			options.reduce((acc, { value, label }) => {
				acc[value] = label || value;
				return acc;
			}, {} as Record<string, string>)
		);
	}

	initOptions(): void {
		const settings = this.getSettings();
		this.options =
			settings.optionsType === "manual"
				? settings.manualOptions
				: getDynamicOptions({ plugin: this.plugin, settings, ctx: this.ctx });
		this.addOptions(this.options);
	}
}

class Select extends ComboboxComponent<Option> {
	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public property: string,
		public isCreateAllowed: boolean
	) {
		super(containerEl);
	}

	getValueFromOption(option: Option): string {
		return option.value;
	}

	onRenderMenuItem(
		item: MenuItem,
		option: {
			value: string;
			label?: string | undefined;
			desc?: string | undefined;
			bgColor?: string | undefined;
			textColor?: string | undefined;
		}
	): void {
		super.onRenderMenuItem(item, option);
		const { value, label, bgColor } = option;
		item.titleEl.empty();
		item.removeIcon();
		const innerEl = item.titleEl.createDiv({
			cls: "better-properties-select-option",
			text: label || value,
		});
		innerEl.setCssProps({
			"--better-properties-select-bg": bgColor ?? selectColors.gray,
		});
	}

	createSelectEl(containerEl: HTMLElement): HTMLDivElement {
		const el = super.createSelectEl(containerEl);
		el.classList.add("better-properties-select");
		return el;
	}

	setValue(value: string): this {
		super.setValue(value);
		const option = this.options.find((opt) => {
			return opt.value === value;
		});
		if (option?.label) {
			this.selectEl.textContent = option.label;
		}
		if (value === "" && option?.label) {
			this.setEmptyClass(false);
		}
		this.selectEl.setCssProps({
			"--better-properties-select-bg": option?.bgColor ?? selectColors.gray,
		});

		return this;
	}

	createOptionItem: MenuItem | undefined;

	createMenu(): SearchableMenu {
		const menu = super.createMenu();

		if (this.isCreateAllowed) {
			menu.addSectionItem("footer", (item) => {
				this.createOptionItem = item.setIcon("lucide-plus" satisfies Icon);
				this.createOptionItem.dom.style.setProperty("display", "none");
			});
		}
		menu.addSectionItem("footer", (item) => {
			item
				.setIcon("lucide-trash-2" satisfies Icon)
				.setTitle("Set empty")
				.onClick(() => {
					this.setValue("");
				});
		});

		if (!this.isCreateAllowed) {
			return menu;
		}
		menu.onShow(() => {
			const { search } = menu;
			if (!search) return;
			search.inputEl.addEventListener("keyup", () => {
				if (!this.createOptionItem) return;

				const newOption = search.getValue();
				if (!newOption) {
					this.createOptionItem.dom.style.setProperty("display", "none");
					return;
				}

				this.createOptionItem.dom.style.removeProperty("display");
				this.createOptionItem
					.setTitle(`Create option "${newOption}"`)
					.onClick(() => {
						this.selectEl.textContent = newOption;
						this.options.push({
							value: newOption,
						});
						this.plugin.saveSettings();
						menu.close();
						this.commitValue();
					});
			});
		});
		return menu;
	}
}

const getDynamicOptions = ({
	plugin,
	settings,
	ctx,
}: {
	plugin: BetterProperties;
	settings: PropertySettings["select"];
	ctx: PropertyRenderContext;
}): Option[] => {
	/**
	 * TODO
	 * Add option to have backgrounds, like by getting the color from a property in the note
	 */

	const arr: Option[] = settings?.dynamicEmptyLabel
		? [
				{
					value: "",
					label: settings.dynamicEmptyLabel,
				},
		  ]
		: [];

	if (settings?.dynamicOptionsType === "filesInFolder") {
		return [
			...arr,
			...getFolderFilesOptions({
				plugin,
				excludeFolderNote: !!settings.folderOptionsExcludeFolderNote,
				sourcePath: ctx.sourcePath,
				propertyName: ctx.key,
				folderOptionsPaths: settings.folderOptionsPaths ?? [],
			}),
		];
	}
	if (settings?.dynamicOptionsType === "filesFromTag") {
		return [
			...arr,
			...getTagOptions({
				plugin,
				tags: settings.tagOptionsTags ?? [],
				includeNested: settings.tagOptionsIncludeNested ?? false,
				sourcePath: ctx.sourcePath,
			}),
		];
	}

	return [];
};

const getFolderFilesOptions = ({
	plugin,
	excludeFolderNote,
	sourcePath,
	folderOptionsPaths,
}: {
	plugin: BetterProperties;
	excludeFolderNote: boolean;
	sourcePath: string;
	propertyName: string;
	folderOptionsPaths: string[];
}): Option[] => {
	const opts = (folderOptionsPaths ?? []).reduce((acc, path) => {
		const folderPath = path === "" || path === undefined ? "/" : path;
		const folder = plugin.app.vault.getFolderByPath(folderPath);
		if (!folder) {
			return [];
		}
		const options = folder.children.reduce((acc, cur) => {
			if (!(cur instanceof TFile) || cur.extension.toLowerCase() !== "md")
				return acc;
			if (excludeFolderNote && folder.name === cur.basename) {
				return acc;
			}
			const link = plugin.app.fileManager.generateMarkdownLink(cur, sourcePath);
			acc.push({
				value: link,
				label: cur.basename,
			});
			return acc;
		}, [] as Option[]);
		return [...acc, ...options];
	}, [] as Option[]);
	return opts;
};

const getTagOptions = ({
	plugin,
	tags,
	includeNested,
	sourcePath,
}: {
	plugin: BetterProperties;
	tags: string[];
	includeNested: boolean;
	sourcePath: string;
}): Option[] => {
	const options: Option[] = [];

	const addOption = (file: TFile) => {
		options.push({
			value: plugin.app.fileManager.generateMarkdownLink(file, sourcePath),
			label: file.basename,
		});
	};

	iterateFileMetadata({
		vault: plugin.app.vault,
		metadataCache: plugin.app.metadataCache,
		callback: ({ file, metadata }) => {
			if (!metadata) return;
			const fileTags = getAllTags(metadata, false);
			if (!fileTags) return;
			if (!includeNested) {
				const fileTagsSet = new Set(fileTags);
				const isMatch = tags.some((t) => fileTagsSet.has(t));
				if (!isMatch) return;
				addOption(file);
				return;
			}
			const isMatch = fileTags.some((fTag) =>
				tags.some((tag) => tag === fTag || fTag.startsWith(`${tag}/`))
			);
			if (!isMatch) return;
			addOption(file);
		},
	});

	return options;
};
