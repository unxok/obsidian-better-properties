import { DropdownComponent, Keymap, Menu, MenuItem, setIcon } from "obsidian";
import { CustomPropertyType, PropertySettings } from "../types";
import { parseWikilink, PropertyWidgetComponent } from "../utils";
import { getFirstLinkPathDest } from "~/lib/utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
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

class SelectTypeComponent extends PropertyWidgetComponent<"select", string> {
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
				? settings.manualOptions ?? []
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
		public containerEl: HTMLDivElement,
		public property: string,
		public isCreateAllowed: boolean,
		public sourcePath: string
	) {
		super(containerEl);
		this.selectContainerEl = containerEl;
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
			"--better-properties-select-bg": bgColor ?? selectColors.transparent,
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

	openLinkedFile: undefined | ((e: PointerEvent | MouseEvent) => void);

	setValue(value: string): this {
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
			"--better-properties-select-bg":
				option?.bgColor ?? selectColors.transparent,
		});
		super.setValue(value);

		if (value.startsWith("[[") && value.endsWith("]]")) {
			const dest = getFirstLinkPathDest(
				this.plugin.app.metadataCache,
				this.sourcePath,
				value
			);
			if (dest) {
				this.selectEl.textContent = "";
				const parsed = parseWikilink(value);
				const linktext = parsed.alias || parsed.path;
				const linkEl = this.selectEl.createDiv({
					cls: "metadata-link-inner internal-link",
					text: linktext,
					attr: {
						"data-href": dest.path,
					},
				});

				linkEl.addEventListener("click", async (e) => {
					if (e.shiftKey) {
						return;
					}
					e.preventDefault();
					const isModEvent = Keymap.isModEvent(e);
					if (isModEvent) {
						await this.plugin.app.workspace.openLinkText(
							dest.path,
							this.sourcePath,
							isModEvent
						);
						return;
					}

					new Menu()
						.addItem((item) =>
							item
								.setIcon("lucide-file" satisfies Icon)
								.setTitle("Follow link")
								.onClick(async (e) => {
									await this.plugin.app.workspace.openLinkText(
										dest.path,
										this.sourcePath,
										Keymap.isModEvent(e)
									);
								})
						)
						.addItem((item) =>
							item
								.setIcon("lucide-chevron-down-circle" satisfies Icon)
								.setTitle("Change value")
								.onClick(() => {
									this.selectContainerEl.click();
								})
						)
						.showAtMouseEvent(e);
				});

				linkEl.addEventListener("contextmenu", (e) => {
					e.preventDefault();
					const linkMenu = new Menu().addSections([
						"title",
						"correction",
						"spellcheck",
						"open",
						"selection",
						"clipboard",
						"action",
						"view",
						"info",
						"",
						"danger",
					]);
					this.plugin.app.workspace.handleLinkContextMenu(
						linkMenu,
						linktext,
						dest.path
					);
					linkMenu.showAtMouseEvent(e);
				});
			}
		}

		return this;
	}

	createOptionItem: MenuItem | undefined;

	createMenu(): SearchableMenu {
		const menu = super.createMenu();

		if (this.isCreateAllowed) {
			menu.addSectionItem("footer", (item) => {
				this.createOptionItem = item;
				item.setIcon("lucide-plus" satisfies Icon);
				this.createOptionItem.dom.classList.add("better-properties-mod-hidden");
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
					this.createOptionItem.dom.classList.add(
						"better-properties-mod-hidden"
					);
					return;
				}

				this.createOptionItem.dom.classList.remove(
					"better-properties-mod-hidden"
				);
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
