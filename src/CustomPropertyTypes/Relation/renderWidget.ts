import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";
import { MultiselectComponent } from "~/classes/MultiSelect";
import { getFirstLinkPathDest } from "~/lib/utils";
import { Keymap, Setting } from "obsidian";
import { LinkSuggest } from "~/classes/InputSuggest/LinkSuggest";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new RelationTypeComponent(plugin, el, value, ctx);
};

class RelationTypeComponent extends PropertyWidgetComponentNew<
	"relation",
	string[]
> {
	type = "relation" as const;
	parseValue = (v: unknown): string[] => {
		if (Array.isArray(v)) {
			return v.map((item) => item?.toString() ?? "");
		}
		return [];
	};

	multiselect: ModifiedMultiselectComponent;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const { relatedProperty } = this.getSettings();
		const sourceFile = this.plugin.app.vault.getFileByPath(this.ctx.sourcePath);
		if (!sourceFile) {
			throw new Error(`File not found at path "${this.ctx.sourcePath}"`);
		}

		// const settings = this.getSettings();
		const parsed = this.parseValue(value);

		let prevousValue = [...parsed];

		this.multiselect = new ModifiedMultiselectComponent(
			plugin,
			el,
			ctx.sourcePath
		)
			.addSuggest((inputEl) => {
				const suggest = new LinkSuggest(
					plugin.app,
					inputEl as HTMLDivElement,
					true
				)
					.setFilter((s) => {
						return !!s.file;
					})
					.onSelect((s) => {
						if (!s.file) {
							return;
						}
						const link = plugin.app.fileManager.generateMarkdownLink(
							s.file,
							ctx.sourcePath,
							undefined,
							s.alias
						);
						suggest.textInputEl.textContent = link;
						suggest.textInputEl.blur();
					});
				suggest.suggestEl.classList.add("mod-property-value");
				return suggest;
			})
			.setValues([...parsed])
			.onChange((v) => {
				this.ctx.onChange(v);
				if (!sourceFile || !relatedProperty) return;
				this.plugin.app.metadataCache.trigger(
					"better-properties:relation-changed",
					{
						file: sourceFile,
						property: this.ctx.key,
						oldValue: prevousValue,
						value: v,
						relatedProperty,
					}
				);
				prevousValue = v;
			})
			.renderValues();

		this.onFocus = () => {
			this.multiselect.focusElement(0);
		};
	}

	getValue(): string[] {
		return this.multiselect.values;
	}

	setValue(value: unknown): void {
		const parsedValue = this.parseValue(value);
		if (this.multiselect.values.some((item, i) => item !== parsedValue[i])) {
			this.multiselect.setValues(parsedValue);
		}
		super.setValue(value);
	}
}

class ModifiedMultiselectComponent extends MultiselectComponent {
	previousValues: string[] = [];
	constructor(
		public plugin: BetterProperties,
		parentEl: HTMLElement | Setting,
		public sourcePath: string
	) {
		super(parentEl);
	}

	setValues(value: string[]): this {
		this.previousValues = [...this.values];
		const parsedValue: string[] = [];
		value.forEach((s) => {
			const file = getFirstLinkPathDest(
				this.plugin.app.metadataCache,
				this.sourcePath,
				s
			);
			if (!file) return;
			parsedValue.push(s);
			// if (s.startsWith("[[") && s.endsWith("]]")) return s;
			// return `[[${s}]]`;
		});
		super.setValues(parsedValue);

		return this;
	}

	renderValues(): this {
		super.renderValues();

		// renderValues is called bv the constructor before plugin is attached as a property
		if (!this.plugin) return this;

		const { workspace, metadataCache } = this.plugin.app;
		this.elements.forEach((el, i) => {
			const value = this.values[i];
			const linkText = value.slice(2, -2);
			const contentEl: HTMLElement | null = el.querySelector(
				"& > .multi-select-pill-content"
			);
			const textEl = contentEl?.firstElementChild;
			if (textEl) {
				textEl.textContent = linkText;
			}
			el.classList.add("internal-link");
			if (!getFirstLinkPathDest(metadataCache, this.sourcePath, value)) {
				el.classList.add("is-unresolved");
			}

			el.addEventListener("click", (e) => {
				if (
					!(
						e.target === el ||
						e.target === contentEl ||
						(e.target instanceof Element && contentEl?.contains(e.target))
					)
				) {
					return;
				}

				workspace.openLinkText(linkText, this.sourcePath, Keymap.isModEvent(e));
				el.classList.remove("is-unresolved");
			});
		});
		return this;
	}
}
