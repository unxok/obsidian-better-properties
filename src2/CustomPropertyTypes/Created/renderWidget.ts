import { moment } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	getPropertyTypeSettings,
	// getPropertyTypeSettings,
	PropertyWidgetComponent,
} from "../utils";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	const settings = getPropertyTypeSettings({
		plugin,
		property: ctx.key,
		type: "created",
	});

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-created",
	});

	const cmp = new PropertyWidgetComponent(
		"created",
		container,
		() => {},
		() => {}
	);

	const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
	if (!file) {
		throw new Error("File not found by ctx.sourcePath of: " + ctx.sourcePath);
	}

	const ctime = file.stat.ctime;
	if (!value || ctime !== value) {
		// property is rendered with no value
		// so it's likely rendered for the first time

		// 0 timeout because without it, it will usually just remove all properties
		window.setTimeout(() => {
			ctx.onChange(ctime);
		}, 0);
	}

	if (!settings.format) {
		const dateInput = container.createEl("input", {
			type: "datetime-local",
			cls: "metadata-input metadata-input-text mod-datetime",
			attr: {
				// disabled: "true",
				"aria-disabled": "true",
			},
		});
		const createdTime = moment(ctime).format("yyyy-MM-DDTHH:mm");

		dateInput.value = createdTime;
		dateInput.addEventListener("input", () => {
			dateInput.value = createdTime;
		});

		cmp.onFocus = () => {
			dateInput.focus();
		};
	}

	if (settings.format) {
		const dateStr = moment(ctime).format(settings.format);
		const inputEl = container.createEl("input", {
			cls: "metadata-input metadata-input-number",
			value: dateStr,
			type: "text",
		});
		inputEl.addEventListener("input", () => {
			inputEl.value = dateStr;
		});
		cmp.onFocus = () => inputEl.focus();
	}

	return cmp;
};
