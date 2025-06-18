import {
	DropdownComponent,
	ExtraButtonComponent,
	Keymap,
	Notice,
	TFile,
} from "obsidian";
import { typeKey } from ".";
import { CustomPropertyType } from "../types";
import { getPropertyTypeSettings, PropertyValueComponent } from "../utils";
import { getFirstLinkPathDest } from "~/lib/utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";

export const renderWidget: CustomPropertyType<string>["renderWidget"] = ({
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

	const dropdown = new DropdownComponent(container);
	if (settings.optionsType === "manual") {
		dropdown.addOptions(
			settings.manualOptions.reduce((acc, cur) => {
				if (cur === undefined) return acc;
				acc[cur.value] = cur.label || cur.value;
				return acc;
			}, {} as Record<string, string>)
		);
	}
	if (settings.optionsType === "dynamic") {
		if (settings.dynamicOptionsType === "filesInFolder") {
			const folderPath =
				settings.folderOptionsPath === "" ||
				settings.folderOptionsPath === undefined
					? "/"
					: settings.folderOptionsPath;
			const folder = plugin.app.vault.getFolderByPath(folderPath);
			if (!folder) {
				const err = `Better Properties: The provided folder "${folderPath}" could not be found in the vault. This was set in the Dropdown settings for property name "${ctx.key}"`;
				new Notice(err, 0);
				console.error(err);
			}
			if (folder) {
				const options = folder.children.reduce((acc, cur) => {
					if (!(cur instanceof TFile) || cur.extension.toLowerCase() !== "md")
						return acc;
					if (
						settings.folderOptionsExcludeFolderNote &&
						folder.name === cur.basename
					) {
						return acc;
					}
					const link = plugin.app.fileManager.generateMarkdownLink(
						cur,
						ctx.sourcePath
					);
					acc[link] = cur.basename;
					return acc;
				}, {} as Record<string, string>);
				dropdown.addOptions(options);
			}
		}
	}

	createLinkEl({
		value,
		plugin,
		parentEl: container,
		sourcePath: ctx.sourcePath,
	});

	dropdown.onChange((v) => {
		ctx.onChange(v);
		createLinkEl({
			value: v,
			plugin,
			parentEl: container,
			sourcePath: ctx.sourcePath,
		});
	});
	dropdown.setValue(value);
	if (value === "") {
		const defaultOption = dropdown.selectEl.querySelector('option[value=""]');
		if (defaultOption) {
			defaultOption.setAttribute("selected", "true");
		}
	}

	const cmp = new PropertyValueComponent(container);
	cmp.focus = () => dropdown.selectEl.focus();
	return cmp;
};

const createLinkEl = ({
	value,
	plugin,
	sourcePath,
	parentEl,
}: {
	value: string;
	plugin: BetterProperties;
	sourcePath: string;
	parentEl: HTMLElement;
}) => {
	if (!value.startsWith("[[") && !value.endsWith("]]")) return;
	if (value.startsWith("[[") && value.endsWith("]]")) {
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
					? `Open "${fileName}"`
					: `"${fileName}" is not created yet. Click to create.`
			)
			.then((btn) => {
				btn.extraSettingsEl.addEventListener("click", (e) => {
					plugin.app.workspace.openLinkText(
						fileName,
						sourcePath,
						Keymap.isModEvent(e)
					);
				});
			});
	}
};
