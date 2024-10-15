import { setIcon, Setting } from "obsidian";
import { CustomTypeWidget } from "..";
import { clampNumber } from "@/libs/utils/pure";
import { IconSuggest } from "@/classes/IconSuggest";
import { createSection } from "@/libs/utils/setting";
import BetterProperties from "@/main";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { text } from "@/i18Next";

export const StarsWidget: CustomTypeWidget = {
	type: "stars",
	icon: "star",
	default: () => 0,
	name: () => text("typeWidgets.stars.name"),
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

		const updateCount = (index: number) => {
			const existingCount = clampNumber(
				Number(container.getAttribute("data-count")),
				min,
				max
			);
			const newCount = existingCount !== index ? index : index - 1;
			container.setAttribute("data-count", newCount.toString());
			starEls.forEach((el, k) => {
				if (k + 1 <= newCount) {
					return el.classList.add("better-properties-svg-fill");
				}
				el.classList.remove("better-properties-svg-fill");
			});
			ctx.onChange(newCount);
		};

		const createStarElement = (index: number) => {
			const span = container.createSpan({
				cls: "clickable-icon better-properties-inline-flex",
				attr: {
					"aria-label": index.toString(),
				},
			});
			starEls.push(span);
			setIcon(span, customIcon);

			if (index <= count) {
				span.classList.add("better-properties-svg-fill");
			}
			span.addEventListener("click", () => updateCount(index));
		};

		for (let i = 1; i < max + 1; i++) {
			createStarElement(i);
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
		.setName(text("typeWidgets.stars.settings.overrideIconSetting.title"))
		.setDesc(text("typeWidgets.stars.settings.overrideIconSetting.desc"))
		.addText((cmp) =>
			cmp
				.setValue(customIcon)
				.onChange((v) => updateForm("customIcon", v))
				.then((cmp) => new IconSuggest(plugin.app, cmp))
		);

	new Setting(content)
		.setName(text("typeWidgets.stars.settings.countSetting.title"))
		.setDesc(text("typeWidgets.stars.settings.countSetting.desc"))
		.addText((cmp) =>
			cmp
				.setValue(max.toString())
				.onChange((v) => updateForm("max", Number(v)))
				.then((cmp) => {
					cmp.inputEl.setAttribute("type", "number");
				})
		);
};
