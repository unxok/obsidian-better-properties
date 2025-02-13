import { ProgressBarComponent, Setting, SliderComponent } from "obsidian";
import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import moment from "moment";

const typeKey: CustomTypeWidget["type"] = "time";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "clock-9",
	default: () => 0,
	name: () => text("typeWidgets.time.name"),
	validate: (v) => !!moment(v?.toString() ?? "", true), // this doesn't work I think
	render: (plugin, el, data, ctx) => {
		const {} = plugin.getPropertySetting(data.key)[typeKey];
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

const createSettings: CreatePropertySettings<typeof typeKey> = (el) => {
	el.createDiv({ text: "Nothing to see here... yet!" });
};

export const Time: WidgetAndSettings = [widget, createSettings];
