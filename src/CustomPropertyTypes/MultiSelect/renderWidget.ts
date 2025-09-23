import { ValueComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";
import { SelectComponent } from "../Select/renderWidget";
import { SelectOption } from "./utils";
import { getDynamicOptions } from "../Select/utils";
import { SearchableMenu } from "~/classes/ComboboxComponent";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new MultiSelectTypeComponent(plugin, el, value, ctx);
};

class MultiSelectTypeComponent extends PropertyWidgetComponentNew<
	"multiselect",
	string[]
> {
	type = "multiselect" as const;
	parseValue = (v: unknown): string[] => (Array.isArray(v) ? v : []);

	component: MultiSelectComponent;
	options: SelectOption[] = [];

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		public value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();
		this.component = new MultiSelectComponent(
			plugin,
			el,
			ctx.key,
			!!settings.manualAllowCreate && settings.optionsType !== "dynamic",
			ctx.sourcePath
		);
		this.initOptions();
	}

	getValue(): string[] {
		return this.component.getValue();
	}

	setValue(value: unknown): void {
		const cmpValue = this.component.getValue();
		const parsed = this.parseValue(value);
		const isSame = parsed.every((v, i) => {
			cmpValue[i] === v;
		});
		if (!isSame) {
			this.component.setValue(parsed);
			this.component.render();
		}
		super.setValue(value);
	}

	async initOptions(): Promise<void> {
		const settings = this.getSettings();
		// if (this.component instanceof SelectComponent) {
		// 	this.component.selectEl.classList.add("better-properties-mod-loader");
		// 	setIcon(this.component.selectEl, "lucide-loader-2" satisfies Icon);
		// }
		const {
			dynamicOptionsType,
			folderOptionsExcludeFolderNote,
			folderOptionsPaths,
			tagOptionsTags,
			tagOptionsIncludeNested,
			inlineJsOptionsCode,
			fileJsOptionsPath,
		} = settings;
		this.options =
			settings.optionsType === "manual"
				? settings.manualOptions
				: await getDynamicOptions({
						plugin: this.plugin,
						ctx: this.ctx,
						dynamicEmptyLabel: undefined,
						dynamicOptionsType,
						fileJsOptionsPath,
						folderOptionsExcludeFolderNote,
						folderOptionsPaths,
						inlineJsOptionsCode,
						tagOptionsIncludeNested,
						tagOptionsTags,
				  });
		// if (this.component instanceof SelectComponent) {
		// 	this.component.selectEl.classList.remove("better-properties-mod-loader");
		// 	this.component.selectEl.empty();
		// }
		this.component.addOptions(this.options);

		const parsed = this.parseValue(this.value);
		this.component.setValue(parsed);
		this.component.onChange((v) => {
			this.setValue(v);
		});
		this.component.render();

		this.onFocus = () => {
			this.component.focus();
		};
	}
}

class MultiSelectComponent extends ValueComponent<string[]> {
	set: Set<string> = new Set();
	onChangeCallback: (v: string[]) => void = () => {};
	itemsContainerEl: HTMLDivElement;
	items: SelectComponent[] = [];
	options: SelectOption[] = [];
	trailingItem: undefined | SelectComponent;

	constructor(
		public plugin: BetterProperties,
		public containerEl: HTMLElement,
		public property: string,
		public isCreateAllowed: boolean,
		public sourcePath: string
	) {
		super();

		this.itemsContainerEl = containerEl.createDiv({
			cls: "better-properties-multiselect-items-container",
		});
		this.itemsContainerEl.addEventListener("click", (e) => {
			if (e.target !== this.itemsContainerEl) return;
			this.trailingItem = this.createTrailingItem();
			this.trailingItem.selectEl.click();
		});
	}

	getValue(): string[] {
		return [...this.set];
	}

	setValue(value: string[]): this {
		this.set = new Set(value);
		// this.trailingItem = this.createTrailingItem();
		return this;
	}

	onChange(cb: (value: string[]) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	addOptions(options: SelectOption[]): void {
		this.options = options.filter(({ value }) => !!value);
		this.render();
	}

	onChanged(): void {
		this.onChangeCallback(this.getValue());
	}

	render(): void {
		this.itemsContainerEl.empty();
		[...this.set].forEach((v, i) => {
			this.items.push(this.createItem(v, i));
		});
		if (this.trailingItem) {
			this.trailingItem.selectContainerEl.remove();
		}
	}

	focus(): void {
		const el = this.items[0] ?? this.trailingItem;
		if (!el) return;
		el.selectEl.focus();
	}

	createTrailingItem(): SelectComponent {
		if (this.trailingItem) {
			this.trailingItem.selectContainerEl.remove();
		}
		const item = this.createItem("", this.set.size);
		return item;
	}

	createItem(value: string, index: number): SelectComponent {
		const cmp = new ModifiedSelectComponent(
			this.plugin,
			this.itemsContainerEl,
			this.property,
			this.isCreateAllowed,
			this.sourcePath,
			this
		);
		cmp.menuOptionFilter = (opt) => {
			return !this.set.has(opt.value);
		};
		cmp.addOptions(this.options);
		cmp.setValue(value);
		cmp.onChange((v) => {
			if (!v) {
				this.set.delete(value);
				this.setValue([...this.set]);
				this.onChanged();
				this.render();
				return;
			}
			const arr = [...this.set];
			arr[index] = v;
			this.setValue(arr);
			this.onChanged();
			this.render();
		});

		return cmp;
	}
}

class ModifiedSelectComponent extends SelectComponent {
	constructor(
		plugin: BetterProperties,
		containerEl: HTMLElement,
		property: string,
		isCreateAllowed: boolean,
		sourcePath: string,
		public owner: MultiSelectComponent
	) {
		super(plugin, containerEl, property, isCreateAllowed, sourcePath);
	}

	override createMenu(): SearchableMenu {
		const menu = super.createMenu();

		menu.scope.register(["Shift"], "Tab", (e) => {
			if (this !== this.owner.trailingItem) return;
			if (this.owner.items.some((item) => item.selectEl.isActiveElement()))
				return;
			e.preventDefault();
			const prevItem = this.owner.items[this.owner.items.length - 1];
			prevItem?.selectEl.focus();
		});

		return menu;
	}
}
