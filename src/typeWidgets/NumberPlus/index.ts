import { App, ButtonComponent, Modal, setIcon, Setting } from "obsidian";
import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { dangerousEval } from "@/libs/utils/pure";
import { text } from "@/i18Next";

const typeKey: CustomTypeWidget["type"] = "numberPlus";

export const widget: CustomTypeWidget = {
	type: typeKey,
	icon: "calculator",
	default: () => 0,
	name: () => text("typeWidgets.numberPlus.name"),
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const { min, max, step, validate } = plugin.getPropertySetting(data.key)[
			typeKey
		];
		const doValidation = (num: number) => {
			if (!validate) return num;
			if (num < min) return min;
			if (num > max) return max;
			return num;
		};
		const doUpdate = (n: number) => {
			const num = Number.isNaN(n) ? 0 : n;
			const valid = doValidation(num);
			ctx.onChange(valid);
			inp.value = valid.toString();
		};
		const container = el.createDiv({
			cls: "better-properties-number-plus-plus",
		});
		const { value } = data;
		const inp = container.createEl("input", {
			attr: {
				type: "number",
				value: Number(value),
				inputmode: "decimal",
				placeholder: text("noValue"),
				min,
				max,
				// step, // inaccurate for inputs that aren't ranges
			},
			cls: "metadata-input metadata-input-number better-properties-w-fit",
		});
		inp.addEventListener("blur", () => {
			doUpdate(inp.valueAsNumber);
		});
		const minus = container.createSpan({ cls: "clickable-icon" });
		setIcon(minus, "minus");
		minus.addEventListener("click", () => {
			doUpdate(inp.valueAsNumber - step);
		});
		const plus = container.createSpan({ cls: "clickable-icon" });
		setIcon(plus, "plus");
		plus.addEventListener("click", () => {
			doUpdate(inp.valueAsNumber + step);
		});
		const exp = container.createSpan({ cls: "clickable-icon" });
		setIcon(exp, "variable");
		exp.addEventListener("click", () => {
			new ExpressionModal(plugin.app, inp.valueAsNumber, doUpdate).open();
		});
	},
};

class ExpressionModal extends Modal {
	defaultNumber: number;
	update: (n: number) => void;
	calculated: number = NaN;
	constructor(app: App, defaultNumber: number, update: (n: number) => void) {
		super(app);
		this.defaultNumber = defaultNumber;
		this.update = update;
	}

	onOpen(): void {
		this.setTitle(text("typeWidgets.numberPlus.expressionModal.title"));
		const { contentEl, defaultNumber } = this;
		let updateBtn: ButtonComponent;
		contentEl.empty();
		// contentEl.createEl('p', {text: ''});
		const setting = new Setting(contentEl)
			.setName(
				text("typeWidgets.numberPlus.expressionModal.expressionSetting.title")
			)
			.setDesc(
				text("typeWidgets.numberPlus.expressionModal.expressionSetting.desc")
			);

		const calculteEl = setting.descEl.createDiv();
		calculteEl.createEl("br");
		calculteEl.createSpan({
			text: text("typeWidgets.numberPlus.expressionModal.calculatedPrefix"),
		});
		const resultEl = calculteEl.createSpan({
			text: defaultNumber.toString(),
		});

		new Setting(contentEl).addButton((cmp) =>
			cmp
				.setCta()
				.setButtonText(text("buttonText.update"))
				.onClick(() => {
					this.close();
					this.update(this.calculated);
				})
				.then((cmp) => (updateBtn = cmp))
		);

		setting.addText((cmp) =>
			cmp.setPlaceholder("(x + 2) - x**4 / Math.PI").onChange((v) => {
				try {
					const n = dangerousEval(`((x) => ${v})(${defaultNumber})`);
					const num = Number(n);
					if (Number.isNaN(n)) throw new Error();
					this.calculated = num;
					updateBtn.setDisabled(false);
					resultEl.textContent = num.toString();
					resultEl.classList.remove("better-properties-text-error");
				} catch (e) {
					updateBtn.setDisabled(true);
					resultEl.textContent = "error";
					resultEl.classList.add("better-properties-text-error");
				}
			})
		);
	}
}

export const createSettings: CreatePropertySettings<typeof typeKey> = (
	el,
	form,
	updateForm
) => {
	const { content } = createSection(
		el,
		text("typeWidgets.numberPlus.name"),
		true
	);

	new Setting(content)
		.setName(text("typeWidgets.numberPlus.settings.validateSetting.title"))
		.setDesc(text("typeWidgets.numberPlus.settings.validateSetting.desc"))
		.addToggle((cmp) =>
			cmp.setValue(form.validate).onChange((b) => updateForm("validate", b))
		);

	new Setting(content)
		.setName(text("typeWidgets.numberPlus.settings.minSetting.title"))
		.setDesc(text("typeWidgets.numberPlus.settings.minSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.min.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("min", num);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.numberPlus.settings.maxSetting.title"))
		.setDesc(text("typeWidgets.numberPlus.settings.maxSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.max.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("max", num);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.numberPlus.settings.stepSetting.title"))
		.setDesc(text("typeWidgets.numberPlus.settings.stepSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.step.toString()).onChange((v) => {
				const n = Number(v);
				const num = Number.isNaN(n) ? 0 : n;
				updateForm("step", num);
			})
		);
};

export const NumberPlus: WidgetAndSettings = [widget, createSettings];
