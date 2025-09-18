import {
	DropdownComponent,
	ExtraButtonComponent,
	Keymap,
	MenuItem,
	setIcon,
} from "obsidian";
import { CustomPropertyType, PropertySettings } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { getFirstLinkPathDest } from "~/lib/utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
import { text } from "~/i18next";
import { selectColors } from "~/lib/constants";
import { ComboboxComponent, SearchableMenu } from "~/classes/ComboboxComponent";
import { Icon } from "~/lib/types/icons";
import { getDynamicOptions } from "./utils";

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

	selectContainerEl: HTMLDivElement;
	component: SelectComponent | DropdownComponent;
	options: Option[] = [];

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		public value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();
		this.selectContainerEl = el.createDiv({
			cls: "better-properties-select-container",
		});
		this.component = settings?.useDefaultStyle
			? new DropdownComponent(this.selectContainerEl)
			: new SelectComponent(
					plugin,
					this.selectContainerEl,
					ctx.key,
					!!settings?.manualAllowCreate && settings.optionsType !== "dynamic",
					ctx.sourcePath
			  );
		this.initOptions();
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

	async initOptions(): Promise<void> {
		const settings = this.getSettings();
		if (this.component instanceof SelectComponent) {
			this.component.selectEl.classList.add("better-properties-mod-loader");
			setIcon(this.component.selectEl, "lucide-loader-2" satisfies Icon);
		}
		const {
			dynamicOptionsType,
			folderOptionsExcludeFolderNote,
			folderOptionsPaths,
			tagOptionsTags,
			tagOptionsIncludeNested,
			inlineJsOptionsCode,
			fileJsOptionsPath,
			dynamicEmptyLabel,
		} = settings;
		this.options =
			settings.optionsType === "manual"
				? settings.manualOptions
				: await getDynamicOptions({
						plugin: this.plugin,
						ctx: this.ctx,
						dynamicEmptyLabel,
						dynamicOptionsType,
						fileJsOptionsPath,
						folderOptionsExcludeFolderNote,
						folderOptionsPaths,
						inlineJsOptionsCode,
						tagOptionsIncludeNested,
						tagOptionsTags,
				  });
		if (this.component instanceof SelectComponent) {
			this.component.selectEl.classList.remove("better-properties-mod-loader");
			this.component.selectEl.empty();
		}
		this.addOptions(this.options);

		const parsed = this.parseValue(this.value);
		this.component.setValue(parsed);
		this.component.onChange((v) => {
			this.setValue(v);
		});

		this.onFocus = () => {
			this.component.selectEl.focus();
		};

		if (!(this.value === "" && this.component instanceof DropdownComponent))
			return;

		// native <select> will not render normally when value is set to empty string
		const defaultOption =
			this.component.selectEl.querySelector('option[value=""]');
		if (!defaultOption) return;
		defaultOption.setAttribute("selected", "true");
	}
}

export class SelectComponent extends ComboboxComponent<Option> {
	selectContainerEl: HTMLDivElement;
	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public property: string,
		public isCreateAllowed: boolean,
		public sourcePath: string
	) {
		super(containerEl);

		this.selectContainerEl = containerEl.createDiv({
			cls: "better-properties-select-container",
		});
		this.selectContainerEl.insertAdjacentElement("afterbegin", this.selectEl);
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

	validateOption(value: string): boolean {
		if (!value) return true;
		return !!this.options.find((o) => o.value === value);
	}

	createAuxEl(containerEl: HTMLElement): HTMLElement {
		const el = super.createAuxEl(containerEl);
		this.selectContainerEl.insertAdjacentElement("beforeend", el);

		const value = this.getValue();
		if (
			!this.validateOption(value) ||
			!(value.startsWith("[[") && value.endsWith("]]"))
		) {
			return el;
		}
		const file = getFirstLinkPathDest(
			this.plugin.app.metadataCache,
			this.sourcePath,
			value
		);

		const tooltip = file
			? text("common.openFile", { fileName: file.name })
			: obsidianText("interface.empty-state.create-new-file");

		const cmp = new ExtraButtonComponent(containerEl)
			.setTooltip(tooltip)
			.setIcon("link" satisfies Icon);
		cmp.extraSettingsEl.addEventListener("click", (e) => {
			this.plugin.app.workspace.openLinkText(
				value.slice(2, -2),
				this.sourcePath,
				Keymap.isModEvent(e)
			);
		});
		return cmp.extraSettingsEl;
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
				this.createOptionItem = item;
				item.setIcon("lucide-plus" satisfies Icon);
				this.createOptionItem.dom.style.setProperty("display", "none");
			});
		}
		menu.addSectionItem("footer", (item) => {
			item
				.setIcon("lucide-trash-2" satisfies Icon)
				.setTitle(obsidianText("interface.menu.remove"))
				.onClick(() => {
					this.setValue("");
					this.onChanged();
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
