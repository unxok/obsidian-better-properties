import {
	DropdownComponent,
	ExtraButtonComponent,
	Keymap,
	Notice,
	TFile,
} from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType, PropertySettings } from "../types";
import { getPropertyTypeSettings, PropertyWidgetComponent } from "../utils";
import {
	getAllTags,
	getFirstLinkPathDest,
	iterateFileMetadata,
} from "~/lib/utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";
import { InputSuggest, Suggestion } from "~/Classes/InputSuggest";
import { selectBackgroundCssVar, selectColors } from "~/lib/constants";
import { SelectComponent } from "~/Classes/SelectComponent";

type Settings = NonNullable<PropertySettings["select"]>;
type Option = NonNullable<Settings["manualOptions"]>[number];

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value: initialValue,
	ctx,
}) => {
	const settings = getPropertyTypeSettings({
		plugin,
		property: ctx.key,
		type: typeKey,
	});

	const value = initialValue?.toString() ?? "";

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-select",
	});

	let isValid = false;
	const setIsValid = (b: boolean) => {
		isValid = b;
	};

	const isStyled = true; //TODO;

	const cmp = isStyled
		? renderSelect({
				container,
				ctx,
				isValid,
				plugin,
				setIsValid,
				settings,
				value,
		  })
		: renderDropdown({
				container,
				ctx,
				isValid,
				plugin,
				setIsValid,
				settings,
				value,
		  });

	createAuxEl({
		value,
		plugin,
		parentEl: container,
		sourcePath: ctx.sourcePath,
		isValid,
	});

	return new PropertyWidgetComponent(
		typeKey,
		container,
		(v) => {
			cmp.setValue(v?.toString() ?? "");
		},
		() => {
			cmp.selectEl.focus();
		}
	);
};

type RenderProps = {
	container: HTMLElement;
	ctx: PropertyRenderContext;
	isValid: boolean;
	plugin: BetterProperties;
	settings: Settings;
	setIsValid: (b: boolean) => void;
	value: string;
};

const renderDropdown = ({
	container,
	ctx,
	plugin,
	isValid,
	setIsValid,
	settings,
	value,
}: RenderProps) => {
	const dropdown = new DropdownComponent(container);
	if (settings.optionsType === "manual" && settings.manualOptions) {
		const options = settings.manualOptions.reduce((acc, cur) => {
			if (cur === undefined) return acc;
			acc[cur.value] = cur.label || cur.value;
			return acc;
		}, {} as Record<string, string>);
		dropdown.addOptions(options);
		setIsValid(value in options);
	}
	if (settings.optionsType === "dynamic") {
		const options = getDynamicOptions({ plugin, settings, ctx });
		dropdown.addOptions(
			options.reduce((acc, opt) => {
				acc[opt.value] = opt.label ?? opt.value;
				return acc;
			}, {} as Record<string, string>)
		);
		setIsValid(value in options);
	}
	dropdown.onChange((v) => {
		setIsValid(
			Array.from(dropdown.selectEl.options).some((opt) => opt.value === v)
		);
		ctx.onChange(v);
		createAuxEl({
			value: v,
			plugin,
			parentEl: container,
			sourcePath: ctx.sourcePath,
			isValid,
		});
	});
	dropdown.setValue(value);
	if (value === "") {
		setIsValid(true);
		const defaultOption = dropdown.selectEl.querySelector('option[value=""]');
		if (defaultOption) {
			defaultOption.setAttribute("selected", "true");
		}
	}

	return dropdown;
};

const renderSelect = ({
	container,
	ctx,
	plugin,
	setIsValid,
	settings,
	value,
}: RenderProps) => {
	const select = new Select(plugin, container, ctx.key);
	if (settings.optionsType === "manual" && settings.manualOptions) {
		const options = settings.manualOptions;
		select.addOptions(options);
		setIsValid(options.some((opt) => opt.value === value));
	}
	if (settings.optionsType === "dynamic") {
		const options = getDynamicOptions({ plugin, settings, ctx });
		select.addOptions(options);
		setIsValid(options.some((opt) => opt.value === value));
	}
	select.onChange((v) => {
		ctx.onChange(v);
		createAuxEl({
			value: v,
			plugin,
			parentEl: container,
			sourcePath: ctx.sourcePath,
			isValid: true,
		});
	});
	select.setValue(value);

	return select;
};

const createAuxEl = ({
	value,
	plugin,
	sourcePath,
	parentEl,
	isValid,
}: {
	value: string;
	plugin: BetterProperties;
	sourcePath: string;
	parentEl: HTMLElement;
	isValid: boolean;
}) => {
	const cls = "better-properties-dropdown-aux";
	const existing = parentEl.querySelectorAll("." + cls);
	if (existing.length) existing.forEach((el) => el.remove());

	if (!isValid) {
		new ExtraButtonComponent(parentEl)
			.setIcon("lucide-alert-circle" satisfies Icon)
			.setTooltip(`Invalid value: "${value}"`)
			.then((btn) => {
				btn.extraSettingsEl.classList.add(cls);
				btn.extraSettingsEl.classList.add("better-properties-mod-error");
			});
	}

	const isWikiLink = value.startsWith("[[") && value.endsWith("]]");
	if (!isWikiLink) return;

	const file = getFirstLinkPathDest(
		plugin.app.metadataCache,
		sourcePath,
		value
	);
	const fileName = file?.basename ?? value.slice(2, -2);
	new ExtraButtonComponent(parentEl)
		.setIcon("link" satisfies Icon)
		.setTooltip(
			file
				? text("common.openFile", { fileName })
				: obsidianText("plugins.page-preview.label-empty-note")
		)
		.then((btn) => {
			btn.extraSettingsEl.classList.add(cls);
			btn.extraSettingsEl.addEventListener("click", (e) => {
				plugin.app.workspace.openLinkText(
					fileName,
					sourcePath,
					Keymap.isModEvent(e)
				);
			});
		});
};

const getDynamicOptions = ({
	plugin,
	settings,
	ctx,
}: {
	plugin: BetterProperties;
	settings: PropertySettings["select"];
	ctx: PropertyRenderContext;
}): Option[] => {
	if (settings?.dynamicOptionsType === "filesInFolder") {
		return getFolderFilesOptions({
			plugin,
			excludeFolderNote: !!settings.folderOptionsExcludeFolderNote,
			sourcePath: ctx.sourcePath,
			propertyName: ctx.key,
			folderOptionsPaths: settings.folderOptionsPaths ?? [],
		});
	}
	if (settings?.dynamicOptionsType === "filesFromTag") {
		return getTagOptions({
			plugin,
			tags: settings.tagOptionsTags ?? [],
			includeNested: settings.tagOptionsIncludeNested ?? false,
			sourcePath: ctx.sourcePath,
		});
	}

	return [];
};

const getFolderFilesOptions = ({
	plugin,
	excludeFolderNote,
	sourcePath,
	propertyName,
	folderOptionsPaths,
}: {
	plugin: BetterProperties;
	excludeFolderNote: boolean;
	sourcePath: string;
	propertyName: string;
	folderOptionsPaths: string[];
}): Option[] => {
	// return (folderOptionsPaths ?? []).reduce((acc, path) => {
	// 	const folderPath = path === "" || path === undefined ? "/" : path;
	// 	const folder = plugin.app.vault.getFolderByPath(folderPath);
	// 	if (!folder) {
	// 		const err = `Better Properties: The provided folder "${folderPath}" could not be found in the vault. This was set in the Dropdown settings for property name "${propertyName}"`;
	// 		new Notice(err, 0);
	// 		console.error(err);
	// 		return {};
	// 	}
	// 	const options = folder.children.reduce((acc, cur) => {
	// 		if (!(cur instanceof TFile) || cur.extension.toLowerCase() !== "md")
	// 			return acc;
	// 		if (excludeFolderNote && folder.name === cur.basename) {
	// 			return acc;
	// 		}
	// 		const link = plugin.app.fileManager.generateMarkdownLink(cur, sourcePath);
	// 		acc[link] = cur.basename;
	// 		return acc;
	// 	}, {} as Record<string, string>);
	// 	return { ...acc, ...options };
	// }, {} as Record<string, string>);

	return (folderOptionsPaths ?? []).reduce((acc, path) => {
		const folderPath = path === "" || path === undefined ? "/" : path;
		const folder = plugin.app.vault.getFolderByPath(folderPath);
		if (!folder) {
			const err = `Better Properties: The provided folder "${folderPath}" could not be found in the vault. This was set in the Dropdown settings for property name "${propertyName}"`;
			new Notice(err, 0);
			console.error(err);
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
	// const options: Record<string, string> = {};

	// const addOption = (file: TFile) => {
	// 	options[plugin.app.fileManager.generateMarkdownLink(file, sourcePath)] =
	// 		file.basename;
	// };

	// iterateFileMetadata({
	// 	vault: plugin.app.vault,
	// 	metadataCache: plugin.app.metadataCache,
	// 	callback: ({ file, metadata }) => {
	// 		if (!metadata) return;
	// 		const fileTags = getAllTags(metadata, false);
	// 		if (!fileTags) return;
	// 		if (!includeNested) {
	// 			const fileTagsSet = new Set(fileTags);
	// 			const isMatch = tags.some((t) => fileTagsSet.has(t));
	// 			if (!isMatch) return;
	// 			addOption(file);
	// 			return;
	// 		}
	// 		const isMatch = fileTags.some((fTag) =>
	// 			tags.some((tag) => tag === fTag || fTag.startsWith(`${tag}/`))
	// 		);
	// 		if (!isMatch) return;
	// 		addOption(file);
	// 	},
	// });

	// return options;

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

class Select extends SelectComponent<Option> {
	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public property: string
	) {
		super(containerEl);

		new SelectSuggest(this).onSelect((option) => {
			this.setValue(option.value);
			this.onChanged();
			this.selectEl.blur();
		});

		this.getStringFromOption((opt) => opt.value);
	}

	getColor(value: string) {
		const settings = getPropertyTypeSettings({
			plugin: this.plugin,
			property: this.property,
			type: typeKey,
		});
		const color = settings.manualOptions?.find(
			(v) => v.value === value
		)?.bgColor;
		return (
			selectColors[color as keyof typeof selectColors] ?? selectColors.gray
		);
	}

	setValue(value: string): this {
		super.setValue(value);
		this.selectContainerEl.style.setProperty(
			selectBackgroundCssVar,
			this.getColor(value)
		);
		return this;
	}
}

class SelectSuggest extends InputSuggest<Option> {
	isTyping: boolean = false;
	constructor(public selectComponent: Select) {
		super(selectComponent.plugin.app, selectComponent.selectEl);

		selectComponent.selectEl.addEventListener("keydown", () => {
			this.isTyping = true;
		});
		selectComponent.selectEl.addEventListener("blur", () => {
			this.isTyping = false;
		});
	}

	getSuggestions(query: string): Option[] {
		const options = this.selectComponent.options;
		if (!query || !this.isTyping) return [...options];
		const lower = query.toLowerCase();
		return options.filter(({ value }) => value.toLowerCase().includes(lower));
	}

	parseSuggestion(opt: Option): Suggestion {
		return {
			title: opt.label || opt.value,
			note: opt.desc || undefined,
		};
	}

	renderSuggestion(opt: Option, el: HTMLElement) {
		super.renderSuggestion(opt, el);
		el.classList.add("better-properties-select-option");
		el.style.setProperty(
			selectBackgroundCssVar,
			this.selectComponent.getColor(opt.value)
		);
	}
}
