import { ProgressBarComponent, Setting, SliderComponent } from "obsidian";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { clampNumber } from "@/libs/utils/pure";

export const ProgressWidget: CustomTypeWidget = {
	type: "progress",
	icon: "percent-square",
	default: () => 0,
	name: () => "Progress",
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const {} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			"progress"
		] ?? {
			...defaultPropertySettings["progress"],
		};
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
			cls: "metadata-input metadata-input-number",
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

		const onMouseMove = (e: MouseEvent) => {
			const { left, width } = progressEl.getBoundingClientRect();
			const relative = Math.floor(e.clientX - left);
			const percentage = Math.round((relative / width) * 100);
			const parsed = parseValue(percentage);
			cmp.setValue(parsed);
			// setTooltip(parsed);
			cmp.showTooltip();
			ctx.onChange(parsed);
			inp.value = parsed.toString();
		};

		const onMouseUp = (e: MouseEvent) => {
			onMouseMove(e);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		const setInpWidth = () => {
			const len = inp.value.length + 3;
			inp.style.setProperty("width", len + "ch");
		};

		setInpWidth();

		const inpUpdateValue = (value: unknown) => {
			const num = parseValue(value);
			cmp.setValue(num);
			ctx.onChange(num);
			inp.value = num.toString();
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

export const createProgressSettings = (
	el: HTMLElement,
	form: PropertySettings["progress"],
	updateForm: <T extends keyof PropertySettings["progress"]>(
		key: T,
		value: PropertySettings["progress"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Progress", true);

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

interface AugmentedProgressComponent extends ProgressBarComponent {
	sliderEl: HTMLElement;
	getValuePretty(): string;
	showTooltip(): void;
	setDynamicTooltip(): void;
}
