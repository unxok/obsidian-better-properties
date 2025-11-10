import { App, displayTooltip, setIcon } from "obsidian";
import {
	CustomPropertyType,
	CustomTypeKey,
	ModifiedPropertyRenderContext,
} from "../types";
import { PropertyWidgetComponent } from "../utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { obsidianText } from "~/i18next/obsidian";
import { PropertyRenderContext } from "obsidian-typings";
import {
	arrayMove,
	EventWithTarget,
	findKeyValueByDotNotation,
	flashElement,
	iterateFileMetadata,
	makeDraggable,
} from "~/lib/utils";
import { PropertyComponent } from "~/classes/PropertyComponent";
import { InputSuggest, Suggestion } from "~/classes/InputSuggest";

export const typeKey = "object" satisfies CustomTypeKey;

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new GroupTypeComponent(plugin, el, value, ctx);
};

class GroupTypeComponent extends PropertyWidgetComponent<
	"object",
	Record<string, unknown>
> {
	type = "object" as const;
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

		const renderSub = (itemKey: string, itemValue: unknown) => {
			const sub = new SubPropertyComponent(
				this.plugin,
				propertiesEl,
				itemKey,
				itemValue,
				this.ctx
				// parsed
			);
			this.subProperties.push(sub);
			sub.render();
		};

		if (!settings.hideAddButton) {
			const addPropertyEl = container.createDiv({
				cls: "better-properties-property-object-add-property metadata-add-button text-icon-button",
				attr: {
					tabindex: "0",
				},
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
			addPropertyEl.addEventListener("keydown", (e) => {
				if (e.key !== " ") return;
				e.preventDefault();
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
		public parentCtx: ModifiedPropertyRenderContext
	) {
		super(
			plugin,
			containerEl,
			parentCtx.key + "." + key,
			value,
			parentCtx.sourcePath
		);
	}

	get parentValue(): Record<string, unknown> {
		const file = this.plugin.app.vault.getFileByPath(this.sourcePath);
		if (!file) {
			throw new Error(`File not found at path "${this.sourcePath}"`);
		}
		const { frontmatter } =
			this.plugin.app.metadataCache.getFileCache(file) ?? {};

		if (this.parentCtx.index !== undefined) {
			// object is within an array, so do this to properly get the object value
			const trueParentKeyArr = this.parentCtx.key.split(".");
			trueParentKeyArr.pop();
			const trueParentKey = trueParentKeyArr.join(".");
			return frontmatter?.[trueParentKey]?.[this.parentCtx.index] ?? {};
		}

		const { value } = findKeyValueByDotNotation(
			this.parentCtx.key,
			frontmatter ?? {}
		);
		return typeof value === "object" && value !== null && value !== undefined
			? value
			: {};
	}

	onChangeCallback: (v: unknown) => void = (value) => {
		this.setValue(value);

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
	}

	override remove(): void {
		super.remove();
		this.updateParent((prev) => ({
			...prev,
			[this.keyWithoutDots]: undefined,
		}));
	}

	isChanged: boolean = false;

	async onKeyChange(
		newKey: string,
		e: EventWithTarget<HTMLInputElement>
	): Promise<void> {
		const newKeyWithDots = this.parentCtx.key + "." + newKey;

		// key made empty, so remove it
		if (newKey === "") {
			this.remove();
			return;
		}

		// key wasn't changed, do nothing
		if (newKey === this.keyWithoutDots) return;

		const alreadyExists = Object.keys(this.parentValue).some(
			(k) => k.toLowerCase() === newKey.toLowerCase()
		);

		if (alreadyExists) {
			e.preventDefault();
			// highlight the existing property for given key
			const matchedEl: HTMLElement | null | undefined = this.containerEl
				.closest(".metadata-container:not(.better-properties-mod-object)")
				?.querySelector(
					`.metadata-property[data-property-key="${newKeyWithDots}" i]`
				);
			matchedEl && flashElement(matchedEl);

			// if focus has left the key input, just remove it
			if (!this.keyInputEl?.isActiveElement()) {
				this.remove();
				return;
			}

			// cursor is still in key input, so show tooltip
			displayTooltip(
				this.propertyEl!,
				obsidianText("properties.msg-duplicate-property-name"),
				{
					classes: ["mod-error"],
				}
			);
			return;
		}

		const oldKeyWithoutDots = this.keyWithoutDots;
		this.setKey(newKey);

		// newly added property
		if (oldKeyWithoutDots === "") {
			this.updateParent((prev) => {
				return { ...prev, [newKey]: null };
			});
			this.setKey(newKey);
			return;
		}

		// key is renamed
		this.updateParent((prev) => {
			const newValue = Object.entries(prev).reduce((acc, [k, v]) => {
				if (k !== oldKeyWithoutDots) {
					acc[k] = v;
					return acc;
				}
				acc[newKey] = v;
				return acc;
			}, {} as Record<string, unknown>);
			return newValue;
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

	override createKeyInputEl(keyEl: HTMLDivElement): HTMLInputElement {
		const keyInputEl = super.createKeyInputEl(keyEl);

		new SubPropertySuggest(
			this.plugin.app,
			keyInputEl,
			this.parentCtx.key,
			Object.keys(this.parentValue),
			this.keyWithoutDots
		).onSelect((n) => {
			keyInputEl.value = n;
		});

		if (this.keyWithoutDots === "") {
			keyInputEl.focus();
		}

		return keyInputEl;
	}
}

class SubPropertySuggest extends InputSuggest<string> {
	constructor(
		app: App,
		textInputEl: HTMLDivElement | HTMLInputElement,
		public parentProperty: string,
		public existingKeys: string[],
		public currentKey: string
	) {
		super(app, textInputEl);
	}

	override open() {
		super.open();
		this.suggestEl.classList.add("mod-property-key");
	}

	getSuggestions(query: string): string[] {
		const suggestions = new Set<string>();

		iterateFileMetadata({
			vault: this.app.vault,
			metadataCache: this.app.metadataCache,
			callback: ({ metadata }) => {
				if (!metadata?.frontmatter) return;
				const { value } = findKeyValueByDotNotation(
					this.parentProperty,
					metadata.frontmatter
				);
				if (!value) return;
				Object.keys(value).forEach((k) => {
					if (k === "#" || !Number.isNaN(Number(k))) return;
					suggestions.add(k);
				});
			},
		});

		const existing = new Set(this.existingKeys);
		existing.delete(this.currentKey);
		const withoutExisting = suggestions.difference(existing);
		if (!query) return [...withoutExisting];

		const lower = query.toLowerCase();
		return [...withoutExisting].filter((n) =>
			n.toLowerCase().startsWith(lower)
		);
	}

	parseSuggestion(value: string): Suggestion {
		const widgetType = this.app.metadataTypeManager.getAssignedWidget(value);
		const icon =
			this.app.metadataTypeManager.registeredTypeWidgets[widgetType ?? "text"]
				?.icon ?? "lucide-text";

		return {
			title: value,
			icon,
		};
	}
}
