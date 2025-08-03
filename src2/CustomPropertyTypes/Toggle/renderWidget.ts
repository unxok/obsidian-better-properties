import { ToggleComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyValueComponent,
} from "../utils";

export const renderWidget: CustomPropertyType<boolean>["renderWidget"] = ({
	// plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	// const settings = getPropertyTypeSettings({
	// 	plugin,
	// 	property: ctx.key,
	// 	type: "toggle",
	// });

	const value = !!initialValue;

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-toggle",
	});

	const toggle = new ToggleComponent(container)
		.setValue(value)
		.onChange((b) => {
			ctx.onChange(b);
		});

	const cmp = new PropertyValueComponent(container);
	cmp.focus = () => toggle.toggleEl.focus();
	return cmp;
};
