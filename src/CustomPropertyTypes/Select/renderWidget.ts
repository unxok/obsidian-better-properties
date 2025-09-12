import {
	DropdownComponent,
	ExtraButtonComponent,
	Keymap,
	TFile,
} from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType, PropertySettings } from "../types";
import { getPropertyTypeSettings, PropertyWidgetComponentNew } from "../utils";
import {
	getAllTags,
	getFirstLinkPathDest,
	iterateFileMetadata,
} from "~/lib/utils";
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
			: new Select(plugin, el, ctx.key);
		this.initOptions();

		const parsed = this.parseValue(value);
		this.component.setValue(parsed);
		this.component.onChange((v) => {
			this.setValue(v);
			this.renderAux();
		});

		this.onFocus = () => {
			this.component.selectEl.focus();
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

		button.extraSettingsEl.classList.add(
			"better-properties-select-aux",
			auxType === "invalid" ? "better-properties-mod-error" : ""
		);

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
		if (this.component instanceof SelectComponent) {
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

class Select extends SelectComponent<Option> {
	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public property: string
	) {
		super(containerEl);

		new SelectSuggest(this).onSelect((option) => {
			this.selectEl.textContent = option.value;
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
		return color ?? selectColors.gray;
	}

	setValue(initialValue: string): this {
		const value =
			this.options.find((o) => o.label && o.label === initialValue)?.value ??
			initialValue;
		super.setValue(value);
		const option = this.options.find((o) => o.value === value);
		if (option?.label) {
			this.selectEl.textContent = option.label;
			this.setEmptyAttr(false);
		}
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
	console.log("folder opts: ", opts);
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
