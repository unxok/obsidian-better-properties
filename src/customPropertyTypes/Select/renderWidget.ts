import {
	DropdownComponent,
	Keymap,
	Menu,
	MenuItem,
	parseLinktext,
	PopoverSuggest,
	setIcon,
} from "obsidian";
import { CustomPropertyType, PropertySettings } from "../types";
import { PropertyWidgetComponent, updatePropertyTypeSettings } from "../utils";
import {
	getFirstLinkPathDest,
	parseWikilink,
	triggerPropertyTypeChange,
} from "~/lib/utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { obsidianText } from "~/i18next/obsidian";
import {
	backgroundCssVar,
	selectBackgroundCssVar,
	selectColors,
} from "~/lib/constants";
import {
	ComboboxComponent,
	ComboboxComponentNew,
	SearchableMenu,
} from "~/classes/ComboboxComponent";
import { Icon } from "~/lib/types/icons";
import { getDynamicOptions, SelectOption } from "./utils";
import { InputSuggest, Suggestion } from "~/classes/InputSuggest";
import { parseLinkText } from "~/lib/utils/pure";

type Settings = NonNullable<PropertySettings["select"]>;
type Option = NonNullable<Settings["manualOptions"]>[number];

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new SelectTypeComponentNew(plugin, el, value, ctx);
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
		this.selectContainerEl = containerEl.createDiv();
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
				if (this.selectEl.firstChild?.nodeType === Node.TEXT_NODE) {
					this.selectEl.firstChild.remove();
				}
				const parsed = parseWikilink(value);
				const linktext = parsed.alias || parsed.path;
				const linkEl = createDiv({
					cls: "metadata-link-inner internal-link",
					text: linktext,
					attr: {
						"data-href": dest.path,
					},
				});
				this.selectEl.insertAdjacentElement("afterbegin", linkEl);

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
									this.selectEl.click();
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

///////////////////////

class SelectTypeComponentNew extends PropertyWidgetComponent<"select", string> {
	type = "select" as const;
	parseValue = (v: unknown) => v?.toString() ?? "";

	component: SelectCombobox | DropdownComponent;
	options: Option[] = [];

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		public value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();
		this.component = settings?.useDefaultStyle
			? new DropdownComponent(el)
			: new SelectCombobox(plugin, el, false, ctx, {
					...settings,
			  }).parseSuggestion((value) => ({
					title: value.label || value.value,
			  }));

		if (!value && this.component instanceof DropdownComponent) {
			// native <select> will not render normally when value is set to empty string
			const defaultOption =
				this.component.selectEl.querySelector('option[value=""]');
			if (!defaultOption) return;
			defaultOption.setAttribute("selected", "true");
		}

		const parsedValue = this.parseValue(value);

		if (this.component instanceof SelectCombobox) {
			const cmp = this.component;
			cmp.searchSuggest.close();

			// cmp.controlEl.parentElement?.addEventListener("click", () => {
			// 	console.log("click");
			// 	cmp.clickableEl.click();
			// });

			cmp.onSelect((opt) => {
				cmp.controlEl.removeAttribute("data-better-properties-is-empty");
				cmp.labelEl.textContent = opt?.label || opt.value;
				cmp.clickableEl.setCssProps({
					[selectBackgroundCssVar]: opt.bgColor ?? "transparent",
				});
			});
			(async () => {
				const options = await cmp.searchSuggest.getSuggestions("");
				const found = options.find((opt) => opt.value === parsedValue);
				if (found?.bgColor) {
					cmp.clickableEl.setCssProps({
						[selectBackgroundCssVar]: found.bgColor,
					});
				}
				cmp.labelEl.textContent = found?.label || parsedValue;
			})();
		}

		this.component.onChange((value) => {
			ctx.onChange(value);
		});

		// link rendering doesn't work properly without the timeout
		// TODO see if I can avoid using a timeout
		window.setTimeout(() => {
			this.component.setValue(parsedValue);
		}, 0);

		this.onFocus = () => {
			const { component } = this;
			const focusEl =
				component instanceof DropdownComponent
					? component.selectEl
					: component.clickableEl;
			focusEl.focus();
		};
	}

	setValue(value: unknown): void {
		const str = value?.toString() ?? "";
		this.component.setValue(str);
	}

	getValue(): string {
		return this.parseValue(this.value);
	}
}

type TypeConfig = Pick<
	Settings,
	| "dynamicEmptyLabel"
	| "dynamicOptionsType"
	| "fileJsOptionsPath"
	| "folderOptionsExcludeFolderNote"
	| "folderOptionsPaths"
	| "inlineJsOptionsCode"
	| "tagOptionsIncludeNested"
	| "tagOptionsTags"
	| "manualOptions"
	| "manualAllowCreate"
	| "folderOptionsIsSubsIncluded"
	| "optionsType"
>;

class SelectCombobox extends ComboboxComponentNew<Option> {
	labelEl: HTMLElement;
	removeEl: HTMLElement;
	constructor(
		plugin: BetterProperties,
		parentEl: HTMLElement,
		public isMultiselect: boolean,
		public ctx: PropertyRenderContext,
		public typeConfig: TypeConfig
	) {
		super(plugin, parentEl);
		this.labelEl = this.clickableEl.createDiv({
			cls: "better-properties-clickable-label",
		});
		this.removeEl = this.clickableEl.createDiv({
			cls: "better-properties-clickable-remove multi-select-pill-remove-button",
		});

		this.removeEl.addEventListener("click", (e) => {
			e.preventDefault();
			this.setValue("");
			this.onChanged();
			this.clickableEl.setCssProps({
				[selectBackgroundCssVar]: "transparent",
			});
		});

		setIcon(this.removeEl, "lucide-x");

		this.getOptions(async (query) => {
			const opts =
				typeConfig.optionsType === "dynamic" && typeConfig.dynamicOptionsType
					? await getDynamicOptions({
							plugin: this.plugin,
							ctx: this.ctx,
							...this.typeConfig,
					  })
					: typeConfig.manualOptions;
			if (!query) return opts ?? [];
			const lower = query.toLowerCase();
			return (
				opts?.filter(
					(o) =>
						o.value.toLowerCase().includes(lower) ||
						o.label?.toLowerCase()?.includes(lower)
				) ?? []
			);
		});

		if (typeConfig.optionsType === "manual" && typeConfig.manualAllowCreate) {
			this.searchSuggest.onCreate((query) => {
				updatePropertyTypeSettings({
					plugin,
					property: ctx.key,
					type: isMultiselect ? "multiselect" : "select",
					cb: (s) => ({
						...s,
						manualOptions: [...(s?.manualOptions ?? []), { value: query }],
					}),
				});
				this.searchSuggest.canClose = true;
				this.searchSuggest.close();
				this.labelEl.textContent = query;
				this.clickableEl.setCssProps({
					[selectBackgroundCssVar]: "transparent",
				});
				this.setValue(query);
				this.onChanged();
				triggerPropertyTypeChange(
					this.plugin.app.metadataTypeManager,
					this.ctx.key
				);
			});
		}

		this.searchSuggest.onRenderSuggestion(({ bgColor }, el) => {
			el.setCssProps({
				[selectBackgroundCssVar]: bgColor ?? "transparent",
			});
		});
	}

	public getStringFromOption(option: Option): string {
		return option.value;
	}

	override setValue(value: string): this {
		super.setValue(value);

		if (value.startsWith("[[") && value.endsWith("]]")) {
			const parsed = parseLinkText(value.slice(2, -2));
			getFirstLinkPathDest;
			const linktext = parsed.alias || parsed.path;
			this.labelEl.empty();
			const linkEl = this.labelEl.createDiv({
				cls: "metadata-link-inner internal-link",
				text: linktext,
				attr: {
					"data-href": parsed.path,
				},
			});
			linkEl.addEventListener("click", async (e) => {
				e.preventDefault();
				await this.plugin.app.workspace.openLinkText(
					parsed.path,
					this.ctx.sourcePath,
					Keymap.isModEvent(e)
				);
			});
		}

		if (!value) {
			this.controlEl.setAttribute("data-better-properties-is-empty", "true");
			return this;
		}
		this.controlEl.removeAttribute("data-better-properties-is-empty");
		return this;
	}
}
