import { ButtonComponent, getIconIds, setIcon } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { Icon } from "~/lib/types/icons";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";
import { ComboboxComponent } from "~/classes/ComboboxComponent";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new IconTypeComponent(plugin, el, value, ctx);
};

class IconTypeComponent extends PropertyWidgetComponentNew<"icon", string> {
	type = "icon" as const;
	parseValue = (v: unknown) => {
		return v?.toString() ?? "";
	};

	button: ButtonComponent;
	value: string;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const parsed = this.parseValue(value);
		this.value = parsed;

		this.button = new ButtonComponent(el);

		this.onFocus = () => {
			this.button.buttonEl.focus();
		};
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: unknown): void {
		if (this.getValue() !== value) {
			// this.iconSelect.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}
