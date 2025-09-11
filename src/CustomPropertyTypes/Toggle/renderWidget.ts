import { ToggleComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new ToggleTypeComponent(plugin, el, value, ctx);
};

class ToggleTypeComponent extends PropertyWidgetComponentNew<
	"toggle",
	boolean
> {
	type = "toggle" as const;
	parseValue = (v: unknown) => !!v;

	toggle: ToggleComponent;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const parsed = this.parseValue(value);
		this.toggle = new ToggleComponent(el).setValue(parsed).onChange((b) => {
			this.setValue(b);
		});

		this.onFocus = () => {
			this.toggle.toggleEl.focus();
		};
	}

	getValue(): boolean {
		return !!this.toggle?.getValue();
	}

	setValue(value: unknown): void {
		if (this.toggle.getValue() !== value) {
			this.toggle.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}
