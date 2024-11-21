import { ProgressBarComponent, Setting, SliderComponent } from "obsidian";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import moment from "moment";

export const TimeWidget: CustomTypeWidget = {
	type: "time",
	icon: "clock-9",
	default: () => 0,
	name: () => text("typeWidgets.time.name"),
	validate: (v) => !!moment(v?.toString() ?? "", true), // this doesn't work I think
	render: (plugin, el, data, ctx) => {
		const {} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			"time"
		] ?? {
			...defaultPropertySettings["time"],
		};
		const container = el.createDiv({
			cls: "better-properties-time-container",
		});
		const { value } = data;

		const toTime = (val: unknown) => {
			const str = val?.toString() ?? "";
			return moment(str, "HH:mm");
		};

		const inp = container.createEl("input", {
			type: "time",
			value: toTime(value).format("HH:mm"),
			cls: "metadata-input-number metadata-input-text",
		});

		inp.addEventListener("input", (e) => {
			const ev = e as MouseEvent & { target: HTMLInputElement };
			const val = ev.target.value;
			const time = toTime(val).format("HH:mm");
			ctx.onChange(time);
		});
	},
};

export const createTimeSettings = (
	el: HTMLElement,
	form: PropertySettings["progress"],
	updateForm: <T extends keyof PropertySettings["progress"]>(
		key: T,
		value: PropertySettings["progress"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Time", true);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.minSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.minSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.min.toString()).onChange((v) => {
	// 			const n = Number(v);
	// 			const num = Number.isNaN(n) ? 0 : n;
	// 			updateForm("min", num);
	// 		})
	// 	);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.maxSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.maxSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.max.toString()).onChange((v) => {
	// 			const n = Number(v);
	// 			const num = Number.isNaN(n) ? 0 : n;
	// 			updateForm("max", num);
	// 		})
	// 	);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.stepSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.stepSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.step.toString()).onChange((v) => {
	// 			const n = Number(v);
	// 			const num = Number.isNaN(n) ? 0 : n;
	// 			updateForm("step", num);
	// 		})
	// 	);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.showLabelsSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.showLabelsSetting.desc"))
	// 	.addToggle((cmp) =>
	// 		cmp
	// 			.setValue(form.showLabels)
	// 			.onChange((b) => updateForm("showLabels", b))
	// 	);
};
