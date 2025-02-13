import { ProgressBarComponent, Setting, SliderComponent } from "obsidian";
import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { clampNumber } from "@/libs/utils/pure";

const typeKey: CustomTypeWidget["type"] = "progress";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "percent-square",
	default: () => 0,
	name: () => text("typeWidgets.progress.name"),
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const {} = plugin.getPropertySetting(data.key)[typeKey];
		const container = el.createDiv({
			cls: "better-properties-progress-container",
		});
		const { value } = data;
		// showLabels &&
		// 	container.createSpan({
		// 		text: min.toString(),
		// 		cls: "better-properties-slider-label-start",
		// 	});
		const parseValue = (value: unknown) => {
			const num = Number(value);
			if (Number.isNaN(num)) return 0;
			return clampNumber(num, 0, 100);
		};
		const currentParsed = parseValue(value);

		const inpContainer = container.createDiv({
			cls: "better-properties-progress-inp-container",
		});
		const inp = inpContainer.createEl("input", {
			value: currentParsed.toString(),
			type: "number",
			cls: "metadata-input metadata-input-number better-properties-progress-input",
			attr: {
				step: "1",
				min: "0",
				max: "100",
			},
		});
		inpContainer.createSpan({
			text: "%",
			cls: "better-properties-progress-percent",
		});

		const cmp = new ProgressBarComponent(container).setValue(
			currentParsed
		) as AugmentedProgressComponent;

		// container.insertAdjacentElement("beforeend", inpContainer);

		cmp.sliderEl = cmp.progressBar;
		cmp.getValuePretty = () => cmp.getValue().toString();
		const fakeSlider = new SliderComponent(document.createElement("span"));
		cmp.showTooltip = function () {
			const sliderShowTooltip = fakeSlider.showTooltip;
			sliderShowTooltip.call(this);
		};
		cmp.setDynamicTooltip = function () {
			const sliderSetDynamicTooltip = fakeSlider.setDynamicTooltip;
			sliderSetDynamicTooltip.call(this);
		};
		cmp.setDynamicTooltip();

		// setTooltip(currentParsed);
		const progressEl = cmp.progressBar;
		progressEl.addEventListener("mousedown", (_e) => {
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});

		progressEl.addEventListener("mouseover", () => cmp.showTooltip());

		const setInpWidth = () => {
			const len = inp.value.length + 0.25;
			inp.style.setProperty("width", len + "ch");
		};

		setInpWidth();

		const inpUpdateValue = (value: unknown) => {
			const num = parseValue(value);
			cmp.setValue(num);
			ctx.onChange(num);
			inp.value = num.toString();
			setInpWidth();
		};

		const onMouseMove = (e: MouseEvent) => {
			const { left, width } = progressEl.getBoundingClientRect();
			const relative = Math.floor(e.clientX - left);
			const percentage = Math.round((relative / width) * 100);
			inpUpdateValue(percentage);
		};

		const onMouseUp = (e: MouseEvent) => {
			onMouseMove(e);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		inp.addEventListener("input", () => {
			setInpWidth();
		});
		inp.addEventListener("blur", (e) => {
			inpUpdateValue((e.target as EventTarget & HTMLInputElement).value);
		});

		inp.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			inpUpdateValue((e.target as EventTarget & HTMLInputElement).value);
		});

		// showLabels &&
		// 	container.createSpan({
		// 		text: max.toString(),
		// 		cls: "better-properties-slider-label-end",
		// 	});
	},
};

const createSettings: CreatePropertySettings<typeof typeKey> = (el) => {
	el.createDiv({ text: "Nothing to see here... yet!" });
};

interface AugmentedProgressComponent extends ProgressBarComponent {
	sliderEl: HTMLElement;
	getValuePretty(): string;
	showTooltip(): void;
	setDynamicTooltip(): void;
}

export const Progress: WidgetAndSettings = [widget, createSettings];
