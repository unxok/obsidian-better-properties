import { setIcon } from "obsidian";
import { CustomPropertyType, ModifiedPropertyRenderContext } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
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
	metadataContainerEl: HTMLDivElement | undefined;
	propertiesEl: HTMLDivElement | undefined;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);
		this.render();
	}

	render(): void {
		const parsed = this.parseValue(this.value);
		const settings = this.getSettings();

		if (this.metadataContainerEl) this.metadataContainerEl.remove();

		const container = this.el.createDiv({
			cls: "better-properties-property-value-inner better-properties-mod-object metadata-container",
			attr: {
				"tabindex": "0",
				"data-better-properties-showindentguide":
					!!this.plugin.app.vault.getConfig("showIndentGuide"),
			},
		});
		this.metadataContainerEl = container;

		const propertiesEl = container.createDiv({
			cls: "better-properties-property-object-properties",
		});
		this.propertiesEl = propertiesEl;

		const renderSub = (
			itemValue: unknown,
			index: number
		): PropertyWidgetComponentBase => {
			const sub = new SubPropertyComponent(
				this,
				propertiesEl,
				index.toString(),
				itemValue,
				index
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
				this.createAndFocusNewItem();
			});
		}

		parsed.forEach((itemValue, index) => {
			renderSub(itemValue, index);
		});

		this.onFocus = () => {
			const el: HTMLElement | null = propertiesEl.querySelector(
				"& > .metadata-property"
			);
			el?.focus();
		};
	}

	createAndFocusNewItem(): void {
		if (!this.propertiesEl) {
			throw new Error("propertiesEl is undefined");
		}
		const v = this.getValue();
		this.value = [...v, null];
		const sub = new SubPropertyComponent(
			this,
			this.propertiesEl,
			v.length.toString(),
			null,
			v.length
		);
		this.subProperties.push(sub);
		const widget = sub.render();
		widget.focus();
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
		public owner: ArrayTypeComponent,
		containerEl: HTMLElement,
		key: string,
		value: unknown,
		public index: number
	) {
		super(
			owner.plugin,
			containerEl,
			owner.ctx.key + "." + key,
			value,
			owner.ctx.sourcePath
		);
	}

	override render(): PropertyWidgetComponentBase {
		const widgetComponent = super.render();

		const removeEl = this.keyEl?.createSpan({
			cls: "better-properties-array-sub-remove",
			attr: {
				"role": "button",
				"aria-label": "Remove property",
			},
		});

		if (!removeEl) return widgetComponent;

		setIcon(removeEl, "lucide-trash-2" satisfies Icon);
		removeEl?.addEventListener("click", () => {
			this.remove();
		});

		return widgetComponent;
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
		if (value === "" || value === undefined || value === null) {
			this.remove();
			return;
		}
		const newParentValue = [...this.owner.getValue()];

		const oldValue = newParentValue[this.index];
		const normalizedOld =
			typeof oldValue === "object" ? JSON.stringify(oldValue) : oldValue;

		const normalizedNew =
			typeof value === "object" ? JSON.stringify(value) : value;

		if (normalizedOld === normalizedNew) {
			return;
		}

		newParentValue[this.index] = value;

		this.owner.ctx.onChange(newParentValue);
		this.owner.value = newParentValue;
	};

	override remove(): void {
		super.remove();
		const newParentValue = this.owner
			.getValue()
			.filter((_, i) => i !== this.index);
		this.owner.ctx.onChange(newParentValue);
		this.owner.value = newParentValue;
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
				const parentValue = this.owner.getValue();
				const newParentValue = arrayMove(parentValue, oldIndex, newIndex);
				this.owner.ctx.onChange(newParentValue);
				this.owner.value = newParentValue;
			},
		});

		return iconEl;
	}

	createValueEl(propertyEl: HTMLDivElement): HTMLDivElement {
		const el = super.createValueEl(propertyEl);
		el.addEventListener("keydown", async (e) => {
			if (e.key !== "Enter") return;
			const isLast = this.index === this.owner.getValue().length - 1;
			if (!(e.key === "Enter" && isLast && e.target instanceof HTMLElement)) {
				return;
			}
			const nearestMetadataPropertyEl = e.target.closest(".metadata-property");
			const containedByObjectSelector =
				'.metadata-property-value[data-property-type="better-properties:object"] > .metadata-container > .better-properties-property-object-properties >';
			const isContainedByObject = nearestMetadataPropertyEl?.matches(
				`${containedByObjectSelector} &`
			);
			const isContainedByArray = nearestMetadataPropertyEl?.matches(
				`${containedByObjectSelector} .metadata-property > .metadata-property-value[data-property-type="better-properties:array"] > .metadata-container > .better-properties-property-object-properties > &`
			);

			// TODO there's probably a more efficient way to do this?
			if (isContainedByObject || isContainedByArray) return;
			this.owner.createAndFocusNewItem();
		});
		return el;
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
