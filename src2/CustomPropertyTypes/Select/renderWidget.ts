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
		cls: "better-properties-property-value-inner better-properties-mod-dropdown",
	});

	let isValid = false;
	const dropdown = new DropdownComponent(container);
	if (settings.optionsType === "manual" && settings.manualOptions) {
		const options = settings.manualOptions.reduce((acc, cur) => {
			if (cur === undefined) return acc;
			acc[cur.value] = cur.label || cur.value;
			return acc;
		}, {} as Record<string, string>);
		dropdown.addOptions(options);
		isValid = value in options;
	}
	if (settings.optionsType === "dynamic") {
		const options = getDynamicOptions({ plugin, settings, ctx });
		dropdown.addOptions(options);
		isValid = value in options;
	}

	createAuxEl({
		value,
		plugin,
		parentEl: container,
		sourcePath: ctx.sourcePath,
		isValid,
	});

	dropdown.onChange((v) => {
		isValid = Array.from(dropdown.selectEl.options).some(
			(opt) => opt.value === v
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
		isValid = true;
		const defaultOption = dropdown.selectEl.querySelector('option[value=""]');
		if (defaultOption) {
			defaultOption.setAttribute("selected", "true");
		}
	}

	return new PropertyWidgetComponent(
		"dropdown",
		container,
		(v) => {
			dropdown.setValue(v?.toString() ?? "");
		},
		() => {
			dropdown.selectEl.focus();
		}
	);
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
}): Record<string, string> => {
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

	return {};
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
}): Record<string, string> => {
	return (folderOptionsPaths ?? []).reduce((acc, path) => {
		const folderPath = path === "" || path === undefined ? "/" : path;
		const folder = plugin.app.vault.getFolderByPath(folderPath);
		if (!folder) {
			const err = `Better Properties: The provided folder "${folderPath}" could not be found in the vault. This was set in the Dropdown settings for property name "${propertyName}"`;
			new Notice(err, 0);
			console.error(err);
			return {};
		}
		const options = folder.children.reduce((acc, cur) => {
			if (!(cur instanceof TFile) || cur.extension.toLowerCase() !== "md")
				return acc;
			if (excludeFolderNote && folder.name === cur.basename) {
				return acc;
			}
			const link = plugin.app.fileManager.generateMarkdownLink(cur, sourcePath);
			acc[link] = cur.basename;
			return acc;
		}, {} as Record<string, string>);
		return { ...acc, ...options };
	}, {} as Record<string, string>);
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
}): Record<string, string> => {
	const options: Record<string, string> = {};

	const addOption = (file: TFile) => {
		options[plugin.app.fileManager.generateMarkdownLink(file, sourcePath)] =
			file.basename;
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
