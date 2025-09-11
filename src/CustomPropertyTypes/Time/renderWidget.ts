import { obsidianText } from "~/i18next/obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";

//TODO add option for hours, hours + minutes, hours + minutes + seconds

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new TimeTypeComponent(plugin, el, value, ctx);
};

class TimeTypeComponent extends PropertyWidgetComponentNew<"time", string> {
	type = "time" as const;
	parseValue = (v: unknown) => v?.toString() ?? "";

	inputEl: HTMLInputElement;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		// el.classList.add();

		const parsed = this.parseValue(value);
		this.inputEl = el.createEl("input", {
			type: "time",
			cls: ["metadata-input-text", "mod-date"],
			attr: {
				placeholder: obsidianText("interface.empty-state.empty"),
			},
		});

		this.inputEl.value = parsed;
		this.inputEl.addEventListener("change", () => {
			this.setValue(this.inputEl.value);
		});

		this.onFocus = () => {
			this.inputEl.focus();
		};
	}

	getValue(): string {
		return this.inputEl.value;
	}

	setValue(value: unknown): void {
		if (this.inputEl.value !== value) {
			this.inputEl.value = this.parseValue(value);
		}
		super.setValue(value);
	}
}
