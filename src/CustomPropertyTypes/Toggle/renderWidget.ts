import { ToggleComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyWidgetComponent,
} from "../utils";
import { typeKey } from ".";
// import { typeKey } from ".";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	// plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	// const settings = getPropertyTypeSettings({
	// 	plugin,
	// 	property: ctx.key,
	// 	type: typeKey,
	// });

	// const setSettings = (typeSettings: PropertySettings[T]) => {
	// 	setPropertyTypeSettings({
	// 		plugin,
	// 		property: ctx.key,
	// 		type: typeKey,
	// 		typeSettings,
	// 	});
	// };

	const value = !!initialValue;

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-toggle",
	});

	const toggle = new ToggleComponent(container)
		.setValue(value)
		.onChange((b) => {
			ctx.onChange(b);
		});

	return new PropertyWidgetComponent(
		typeKey,
		container,
		(v) => {
			toggle.setValue(!!v);
		},
		() => {
			toggle.toggleEl.focus();
		}
	);
};
