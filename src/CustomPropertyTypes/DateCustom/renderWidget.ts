import { moment, setIcon } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	getPropertyTypeSettings,
	// getPropertyTypeSettings,
	PropertyWidgetComponent,
} from "../utils";
import { typeKey } from ".";
import { obsidianText } from "~/i18next/obsidian";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	const settings = getPropertyTypeSettings({
		plugin,
		property: ctx.key,
		type: typeKey,
	});

	// const setSettings = (typeSettings: PropertySettings[T]) => {
	// 	setPropertyTypeSettings({
	// 		plugin,
	// 		property: ctx.key,
	// 		type: typeKey,
	// 		typeSettings,
	// 	});
	// };

	const isEmptyAttr = "data-better-properties-is-empty";

	const format = settings.format ?? "YYYY-MM-DD";
	const placeholder =
		settings.placeholder ?? obsidianText("interface.empty-state.empty");
	const icon = settings.icon ?? "lucide-calendar";
	const inputType = settings.type ?? "date";
	const rawFormat = inputType === "date" ? "YYYY-MM-DD" : "YYYY-MM-DDThh:mm:ss";
	const max = inputType === "date" ? "9999-12-31" : "9999-12-31T23:59";

	const value = !initialValue ? undefined : moment(initialValue.toString());

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-datecustom",
	});

	const buttonContainer = container.createDiv({
		cls: "better-properties-datecustom-button-container",
	});

	const inputEl = buttonContainer.createEl("input", {
		type: inputType,
		attr: {
			"max": max,
			"placeholder": obsidianText("interface.empty-state.empty"),
			"aria-hidden": "true",
		},
	});

	const buttonEl = buttonContainer.createDiv({
		cls: "better-properties-datecustom-button clickable-icon",
		attr: {
			role: "button",
			tabindex: "0",
		},
	});
	setIcon(buttonEl, icon);
	buttonEl.addEventListener("click", () => {
		inputEl.showPicker();
	});
	buttonEl.addEventListener("keydown", (e) => {
		if (e.key !== " ") return;
		inputEl.showPicker();
	});

	const formatEl = container.createDiv({
		cls: "better-properties-datecustom-format metadata-input-longtext",
		text: value?.format(format) ?? placeholder,
		attr: {
			[isEmptyAttr]: !initialValue || null,
		},
	});

	const setValue = (v: unknown): void => {
		if (!v) {
			formatEl.textContent = placeholder;
			formatEl.setAttribute(isEmptyAttr, "true");
			ctx.onChange(null);
			return;
		}
		const date = moment(v);
		if (!date.isValid) {
			return;
		}
		formatEl.removeAttribute(isEmptyAttr);
		formatEl.textContent = date.format(format);
		ctx.onChange(date.format(rawFormat));
	};

	inputEl.addEventListener("change", (e) => {
		const v = (e.target as HTMLInputElement).value;
		setValue(v);
	});

	return new PropertyWidgetComponent(
		typeKey,
		container,
		(v) => {
			setValue(v);
		},
		() => {
			buttonEl.focus();
		}
	);
};
