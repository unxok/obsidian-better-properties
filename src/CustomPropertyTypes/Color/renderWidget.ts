import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { ColorTextComponent } from "~/classes/ColorTextComponent";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new ColorTypeComponent(plugin, el, value, ctx);
};

class ColorTypeComponent extends PropertyWidgetComponentNew<"color", string> {
	type = "color" as const;
	parseValue = (v: unknown) => v?.toString() ?? "";

	colorText: ColorTextComponent;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const parsed = this.parseValue(value);
		this.colorText = new ColorTextComponent(el)
			.setValue(parsed)
			.onChange((v) => {
				this.setValue(v);
			});

		this.onFocus = () => {
			this.colorText.colorInputEl.focus();
		};
	}

	getValue(): string {
		return this.colorText.getValue() ?? "";
	}

	setValue(value: unknown): void {
		if (this.colorText.getValue() !== value) {
			this.colorText.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}
