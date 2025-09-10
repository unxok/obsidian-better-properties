import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyWidgetComponent,
} from "../utils";
import { ColorTextComponent } from "~/Classes/ColorTextComponent";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
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

	// const setSettings = (typeSettings: PropertySettings[T]) => {
	// 	setPropertyTypeSettings({
	// 		plugin,
	// 		property: ctx.key,
	// 		type: 'toggle',
	// 		typeSettings,
	// 	});
	// };

	const value = initialValue?.toString() ?? "";

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-color",
	});

	const colorTextComponent = new ColorTextComponent(container)
		.setValue(value)
		.onChange((b) => {
			ctx.onChange(b);
		});

	return new PropertyWidgetComponent(
		"color",
		container,
		(v) => {
			colorTextComponent.setValue(v?.toString() ?? "");
		},
		() => {
			colorTextComponent.colorInputEl.focus();
		}
	);
};
