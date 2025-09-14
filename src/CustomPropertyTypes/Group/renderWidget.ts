import { displayTooltip, setIcon } from "obsidian";
import { CustomPropertyType, CustomTypeKey } from "../types";
import {
	flashElement,
	PropertyWidgetComponentNew,
	triggerPropertyTypeChange,
} from "../utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { obsidianText } from "~/i18next/obsidian";
import { PropertyRenderContext } from "obsidian-typings";
import { arrayMove, makeDraggable } from "~/lib/utils";
import { PropertyComponent } from "~/classes/PropertyComponent";

export const typeKey = "group" satisfies CustomTypeKey;

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new GroupTypeComponent(plugin, el, value, ctx);
};

class GroupTypeComponent extends PropertyWidgetComponentNew<
	"group",
	Record<string, unknown>
> {
	type = "group" as const;
	parseValue = (v: unknown) => {
		if (typeof v !== "object" || !v) return {} as Record<string, unknown>;
		return v as Record<string, unknown>;
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

	render(): void {
		const parsed = this.parseValue(this.value);
		const settings = this.getSettings();
		this.renderCollapseIndicator(settings);

		const container = this.el.createDiv({
			cls: "better-properties-property-value-inner better-properties-mod-group metadata-container",
			attr: {
				tabindex: "0",
			},
		});

		const propertiesEl = container.createDiv({
			cls: "better-properties-property-group-properties",
		});

		const renderSub = (itemKey: string, itemValue: unknown) => {
			const sub = new SubPropertyComponent(
				this.plugin,
				propertiesEl,
				itemKey,
				itemValue,
				this.ctx,
				parsed
			);
			this.subProperties.push(sub);
			sub.render();
		};

		if (!settings.hideAddButton) {
			const addPropertyEl = container.createDiv({
				cls: "better-properties-property-group-add-property metadata-add-button text-icon-button",
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
				renderSub("", null);
			});
		}

		for (const [itemKey, itemValue] of Object.entries(parsed)) {
			renderSub(itemKey, itemValue);
		}

		this.onFocus = () => {
			const el: HTMLElement | null = propertiesEl.querySelector(
				"& > .metadata-property"
			);
			el?.focus();
		};
	}

	renderCollapseIndicator(settings: ReturnType<typeof this.getSettings>): void {
		const collapseCls = "better-properties-properties-group-collapse-indicator";
		const keyEl = this.el.parentElement?.querySelector(
			".metadata-property-key"
		);

		const existingCollapseIndicator: HTMLElement | undefined | null =
			keyEl?.querySelector(`& > .${collapseCls}`);

		existingCollapseIndicator?.remove();

		const collapseIndicator = keyEl?.createDiv({
			cls: collapseCls,
		});
		if (collapseIndicator) {
			setIcon(collapseIndicator, "lucide-chevron-down" satisfies Icon);

			const setAttr = (isCollapsed: boolean) => {
				const attr = "data-better-properties-is-collapsed";
				isCollapsed
					? collapseIndicator.setAttribute(attr, "true")
					: collapseIndicator.removeAttribute(attr);
			};

			setAttr(!!settings.collapsed);

			collapseIndicator.addEventListener("click", () => {
				settings.collapsed = !settings.collapsed;
				setAttr(settings.collapsed);
				this.setSettings({ ...settings });
			});
		}
	}

	getValue(): Record<string, unknown> {
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
		public parentCtx: PropertyRenderContext,
		public parentValue: Record<string, unknown>
	) {
		super(
			plugin,
			containerEl,
			parentCtx.key + "." + key,
			value,
			parentCtx.sourcePath
		);
	}

	onChangeCallback: (v: unknown) => void = (value) => {
		this.parentCtx.onChange({
			...this.parentValue,
			[this.keyWithoutDots]: value,
		});
	};

	updateParent(
		cb: (oldParentValue: Record<string, unknown>) => Record<string, unknown>
	): void {
		const newParentValue = cb(this.parentValue);
		this.parentCtx.onChange(newParentValue);
		triggerPropertyTypeChange(this.plugin.app.metadataTypeManager, this.key);
	}

	override remove(): void {
		this.updateParent((prev) => ({
			...prev,
			[this.keyWithoutDots]: undefined,
		}));
	}

	override updateKey(newKey: string): void {
		const newKeyWithDots = this.parentCtx.key + "." + newKey;

		if (newKey === this.keyWithoutDots) return;

		// key made empty, so remove it
		if (newKey === "") {
			this.remove();
			return;
		}

		const alreadyExists = Object.keys(this.parentValue).some(
			(k) => k.toLowerCase() === newKey.toLowerCase()
		);

		if (alreadyExists) {
			const matchedEl: HTMLElement | null | undefined = this.containerEl
				.closest(".metadata-container:not(.better-properties-mod-group)")
				?.querySelector(
					`.metadata-property[data-property-key="${newKeyWithDots}" i]`
				);
			matchedEl && flashElement(matchedEl);

			if (!this.keyInputEl?.isActiveElement()) {
				this.remove();
				return;
			}
			displayTooltip(
				this.propertyEl!,
				obsidianText("properties.msg-duplicate-property-name"),
				{
					classes: ["mod-error"],
				}
			);
			return;
		}

		// newly added property
		if (this.keyWithoutDots === "") {
			this.updateParent((prev) => {
				return { ...prev, [newKey]: null };
			});
			return;
		}

		// key is renamed
		this.updateParent((prev) => {
			return Object.entries(prev).reduce((acc, [k, v]) => {
				if (k !== this.keyWithoutDots) {
					acc[k] = v;
					return acc;
				}
				acc[newKey] = v;
				return acc;
			}, {} as Record<string, unknown>);
		});
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
					const entries = Object.entries(prev);
					const indexMoved = arrayMove(entries, oldIndex, newIndex);
					return Object.fromEntries(indexMoved);
				});
			},
		});

		return iconEl;
	}
}
