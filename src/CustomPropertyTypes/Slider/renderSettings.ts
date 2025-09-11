import { Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { typeKey } from ".";

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl } = modal;

	const settings = getPropertyTypeSettings({
		plugin,
		property: property,
		type: typeKey,
	});

	modal.onTabChange(() => {
		setPropertyTypeSettings({
			plugin,
			property: property,
			type: typeKey,
			typeSettings: { ...settings },
		});
	});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.slider.settings.min.title"))
		.setDesc(text("customPropertyTypes.slider.settings.min.desc"))
		.addText((cmp) => {
			cmp.inputEl.setAttribute("type", "number");
			cmp.inputEl.setAttribute("inputmode", "decimal");
			cmp
				.setPlaceholder("0")
				.setValue(settings.min?.toString() ?? "")
				.onChange((v) => {
					if (!v) {
						settings.min = undefined;
						return;
					}
					settings.min = Number(v);
				});
		});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.slider.settings.max.title"))
		.setDesc(text("customPropertyTypes.slider.settings.max.desc"))
		.addText((cmp) => {
			cmp.inputEl.setAttribute("type", "number");
			cmp.inputEl.setAttribute("inputmode", "decimal");
			cmp
				.setPlaceholder("100")
				.setValue(settings.max?.toString() ?? "")
				.onChange((v) => {
					if (!v) {
						settings.max = undefined;
						return;
					}
					settings.max = Number(v);
				});
		});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.slider.settings.step.title"))
		.setDesc(text("customPropertyTypes.slider.settings.step.desc"))
		.addText((cmp) => {
			cmp.inputEl.setAttribute("type", "number");
			cmp.inputEl.setAttribute("inputmode", "decimal");
			cmp
				.setPlaceholder("1")
				.setValue(settings.step?.toString() ?? "")
				.onChange((v) => {
					if (!v) {
						settings.step = undefined;
						return;
					}
					settings.step = Number(v);
				});
		});

	new Setting(tabContentEl)
		.setName(text("customPropertyTypes.slider.settings.hideLimits.title"))
		.setDesc(text("customPropertyTypes.slider.settings.hideLimits.desc"))
		.addToggle((cmp) => {
			cmp.setValue(!!settings.hideLimits).onChange((b) => {
				settings.hideLimits = b;
			});
		});
};
