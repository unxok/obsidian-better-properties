import { setIcon } from "obsidian";
import { CustomPropertyType, ModifiedPropertyRenderContext } from "../types";
import {
	PropertyWidgetComponentNew,
	triggerPropertyTypeChange,
} from "../utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { obsidianText } from "~/i18next/obsidian";
import {
	PropertyRenderContext,
	PropertyWidget,
	PropertyWidgetComponentBase,
} from "obsidian-typings";
import { arrayMove, makeDraggable } from "~/lib/utils";
import { PropertyComponent } from "~/classes/PropertyComponent";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new ArrayTypeComponent(plugin, el, value, ctx);
};

class ArrayTypeComponent extends PropertyWidgetComponentNew<
	"array",
	unknown[]
> {
	type = "array" as const;
	parseValue = (v: unknown): unknown[] => {
		if (Array.isArray(v)) return v;
		return [];
	};

	subProperties: SubPropertyComponent[] = [];

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);
		this.render();
	}

	render(focusLastItem?: boolean): void {
		const parsed = this.parseValue(this.value);
		const settings = this.getSettings();

		this.el.empty();

		const container = this.el.createDiv({
			cls: "better-properties-property-value-inner better-properties-mod-object metadata-container",
			attr: {
				"tabindex": "0",
				"data-better-properties-showindentguide":
					!!this.plugin.app.vault.getConfig("showIndentGuide"),
			},
		});

		const propertiesEl = container.createDiv({
			cls: "better-properties-property-object-properties",
		});

		const renderSub = (
			itemValue: unknown,
			index: number
		): PropertyWidgetComponentBase => {
			const sub = new SubPropertyComponent(
				this.plugin,
				propertiesEl,
				index.toString(),
				itemValue,
				index,
				this.ctx
				// parsed
			);
			this.subProperties.push(sub);
			return sub.render();
		};

		if (!settings.hideAddButton) {
			const addPropertyEl = container.createDiv({
				cls: "better-properties-property-object-add-property metadata-add-button text-icon-button",
			});
			setIcon(
				addPropertyEl.createSpan({ cls: "text-button-icon" }),
				"lucide-plus" satisfies Icon
			);
			addPropertyEl.createSpan({
				cls: "text-button-label",
				text: obsidianText("properties.label-add-property-button"),
			});
			addPropertyEl.addEventListener("click", () => {
				// renderSub(null, parsed.length);
				const v = this.getValue();
				this.value = [...v, null];
				this.render(true);
			});
		}

		parsed.forEach((itemValue, index) => {
			const widgetComponent = renderSub(itemValue, index);
			if (!(focusLastItem && index === parsed.length - 1)) return;
			widgetComponent.focus();
		});

		this.onFocus = () => {
			const el: HTMLElement | null = propertiesEl.querySelector(
				"& > .metadata-property"
			);
			el?.focus();
		};
	}

	getValue(): unknown[] {
		return this.parseValue(this.value);
	}

	setValue(value: unknown): void {
		super.setValue(value);
		const parsed = this.parseValue(value);
		if (JSON.stringify(parsed) !== JSON.stringify(this.getValue())) {
			this.render();
		}
	}
}
class SubPropertyComponent extends PropertyComponent {
	constructor(
		plugin: BetterProperties,
		containerEl: HTMLElement,
		key: string,
		value: unknown,
		public index: number,
		public parentCtx: PropertyRenderContext // public parentValue: unknown[]
	) {
		super(
			plugin,
			containerEl,
			parentCtx.key + "." + key,
			value,
			parentCtx.sourcePath
		);
	}

	get parentValue(): unknown[] {
		const file = this.plugin.app.vault.getFileByPath(this.sourcePath);
		if (!file) {
			throw new Error(`File not found at path "${this.sourcePath}"`);
		}
		const { frontmatter } =
			this.plugin.app.metadataCache.getFileCache(file) ?? {};
		return frontmatter?.[this.parentCtx.key] ?? [];
	}

	override createKeyInputEl(keyEl: HTMLDivElement): HTMLInputElement {
		// create the keyEl without a value nor any event listeners
		return keyEl.createEl("input", {
			cls: "metadata-property-key-input",
			type: "text",
			attr: {
				"autocapitalize": "none",
				"enterkeyhint": "next",
				"aria-label": this.key,
			},
		});
	}

	onChangeCallback = (value: unknown) => {
		const newParentValue = this.parentValue;
		newParentValue[this.index] = value;
		this.parentCtx.onChange(newParentValue);
	};

	updateParent(cb: (oldParentValue: unknown[]) => unknown[]): void {
		const newParentValue = cb(this.parentValue);
		this.parentCtx.onChange(newParentValue);
		triggerPropertyTypeChange(this.plugin.app.metadataTypeManager, this.key);
	}

	override remove(): void {
		super.remove();
		this.parentCtx.onChange(
			this.parentValue.filter((_, i) => i !== this.index)
		);
		triggerPropertyTypeChange(
			this.plugin.app.metadataTypeManager,
			this.parentCtx.key
		);
	}

	override updateKey(_newKey: string): void {
		return;
	}

	createIconEl(valueEl: HTMLDivElement): HTMLSpanElement {
		const iconEl = super.createIconEl(valueEl);

		if (!this.propertyEl) return iconEl;

		makeDraggable({
			itemEl: this.propertyEl,
			dragHandleEl: iconEl,
			parentEl: this.containerEl,
			itemsQuerySelector: "& > .metadata-property",
			onDragEnd: (oldIndex, newIndex) => {
				this.updateParent((prev) => {
					const entries = Object.values(prev);
					return arrayMove(entries, oldIndex, newIndex);
				});
			},
		});

		return iconEl;
	}

	renderWidget(
		valueEl: HTMLDivElement,
		widget: PropertyWidget
	): PropertyWidgetComponentBase {
		valueEl.empty();
		return widget.render(valueEl, this.value, {
			app: this.plugin.app,
			blur: () => {},
			key: this.key,
			onChange: (value: unknown) => {
				this.onChangeCallback(value);
			},
			sourcePath: this.sourcePath,
			index: this.index,
		} as ModifiedPropertyRenderContext);
	}
}
