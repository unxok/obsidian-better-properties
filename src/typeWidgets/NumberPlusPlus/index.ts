import {
	App,
	ButtonComponent,
	EditableFileView,
	FileView,
	Modal,
	setIcon,
	Setting,
	WorkspaceLeaf,
} from "obsidian";
import { defaultPropertySettings } from "@/libs/utils/augmentMedataMenu/addSettings";
import { CustomTypeWidget } from "..";

export const NumberPlusPlusWidget: CustomTypeWidget = {
	type: "number-plus-plus",
	icon: "calculator",
	default: () => 0,
	name: () => "Number++",
	validate: (v) => !Number.isNaN(Number(v)),
	render: (plugin, el, data, ctx) => {
		const { min, max, step, validate } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.["number-plus-plus"] ?? {
			...defaultPropertySettings["number-plus-plus"],
		};
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
				placeholder: "No value",
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
		this.setTitle("Expression update");
		const { contentEl, defaultNumber } = this;
		let updateBtn: ButtonComponent;
		contentEl.empty();
		// contentEl.createEl('p', {text: ''});
		const setting = new Setting(contentEl)
			.setName("Expression")
			.setDesc(
				'Enter a valid JavaScript expression. Use "x" for the current value.'
			);

		const calculteEl = setting.descEl.createDiv();
		calculteEl.createEl("br");
		calculteEl.createSpan({ text: "Calculated: " });
		const resultEl = calculteEl.createSpan({
			text: defaultNumber.toString(),
		});

		new Setting(contentEl).addButton((cmp) =>
			cmp
				.setCta()
				.setButtonText("update")
				.onClick(() => {
					this.close();
					this.update(this.calculated);
				})
				.then((cmp) => (updateBtn = cmp))
		);

		setting.addText((cmp) =>
			cmp.setPlaceholder("(x + 2) - x**4 / Math.PI").onChange((v) => {
				try {
					const n = eval(`((x) => ${v})(${defaultNumber})`);
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
