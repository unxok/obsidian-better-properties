import { App, Component, ToggleComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyValueComponent,
} from "../utils";
import { PropertyWidget } from "obsidian-typings";

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

	console.log("value: ", initialValue);

	const value = !!initialValue;

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-toggle",
	});

	const toggle = new ToggleComponent(container)
		.setValue(value)
		.onChange((b) => {
			ctx.onChange(b);
		});

	return new PropertyValueComponent(
		container,
		(v) => {
			toggle.setValue(!!v);
		},
		() => {
			toggle.toggleEl.focus();
		}
	);
};
