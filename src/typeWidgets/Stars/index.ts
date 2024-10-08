import { ButtonComponent, DropdownComponent, setIcon, Setting } from "obsidian";
import { CustomTypeWidget } from "..";
import { clampNumber, getButtonStyledClass } from "@/libs/utils/pure";
import { IconSuggest } from "@/classes/IconSuggest";
import { TextColorComponent } from "@/classes/TextColorComponent";
import { createSection } from "@/libs/utils/setting";
import BetterProperties from "@/main";
import {
	defaultPropertySettings,
	PropertySettings,
} from "@/libs/PropertySettings";

export const StarsWidget: CustomTypeWidget = {
	type: "stars",
	icon: "star",
	default: () => 0,
	name: () => "Stars",
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const { customIcon, max } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.["stars"] ?? {
			...defaultPropertySettings["stars"],
		};

		const container = el.createDiv({
			cls: "metadata-input-longtext",
			attr: {
				"data-count": data.value?.toString() ?? "1",
			},
		});

		const min = 0;

		const count = clampNumber(Number(data.value), min, max);
		const starEls: HTMLElement[] = [];

		for (let i = 1; i < max + 1; i++) {
			const span = container.createSpan({
				cls: "clickable-icon better-properties-inline-flex",
				attr: {
					"aria-label": i.toString(),
				},
			});
			starEls.push(span);
			setIcon(span, customIcon);

			if (i <= count) {
				span.classList.add("better-properties-svg-fill");
			}

			span.addEventListener("click", () => {
				const existingCount = clampNumber(
					Number(container.getAttribute("data-count")),
					min,
					max
				);
				const newCount = existingCount !== i ? i : i - 1;
				container.setAttribute("data-count", newCount.toString());
				starEls.forEach((el, k) => {
					if (k + 1 <= newCount) {
						return el.classList.add("better-properties-svg-fill");
					}
					el.classList.remove("better-properties-svg-fill");
				});
				ctx.onChange(newCount);
			});
		}
	},
};

export const createStarsSettings = (
	el: HTMLElement,
	form: PropertySettings["stars"],
	updateForm: <T extends keyof PropertySettings["stars"]>(
		key: T,
		value: PropertySettings["stars"][T]
	) => void,
	plugin: BetterProperties
	// defaultOpen: boolean
) => {
	const { customIcon, max } = form;

	const { content } = createSection(el, "Button", true);

	new Setting(content)
		.setName("Override star icon")
		.setDesc("Set a custom icon to show in place of the default stars.")
		.addText((cmp) =>
			cmp
				.setValue(customIcon)
				.onChange((v) => updateForm("customIcon", v))
				.then((cmp) => new IconSuggest(plugin.app, cmp))
		);

	new Setting(content)
		.setName("Count")
		.setDesc("How many stars to display.")
		.addText((cmp) =>
			cmp
				.setValue(max.toString())
				.onChange((v) => updateForm("max", Number(v)))
				.then((cmp) => {
					cmp.inputEl.setAttribute("type", "number");
				})
		);
};
