import {
	App,
	ButtonComponent,
	Modal,
	setIcon,
	Setting,
	SliderComponent,
	ToggleComponent,
} from "obsidian";
import { typeWidgetPrefix } from "src/lib/constants";
import PropertiesPlusPlus from "src/main";

const key = typeWidgetPrefix + "number-plus-plus";
const name = "Number++";

export const registerNumberPlusPlus = (plugin: PropertiesPlusPlus) => {
	plugin.app.metadataTypeManager.registeredTypeWidgets[key] = {
		icon: "calculator",
		default: () => 0,
		name: () => name,
		validate: (v) => !Number.isNaN(Number(v)),
		type: key,
		render: (el, data, ctx) => {
			const container = el
				// .createDiv({
				// 	cls: "metadata-input metadata-input-number",
				// })
				.createDiv({ cls: "properties-plus-plus-number-plus-plus" });
			const { value } = data;
			const inp = container.createEl("input", {
				attr: {
					type: "number",
					value: Number(value),
					inputmode: "decimal",
					placeholder: "No value",
				},
				cls: "metadata-input metadata-input-number properties-plus-plus-w-fit",
			});
			inp.addEventListener("blur", (e) => {
				const num = Number(inp.value);
				ctx.onChange(num);
			});
			const minus = container.createSpan({ cls: "clickable-icon" });
			setIcon(minus, "minus");
			minus.addEventListener("click", () => {
				const num = Number(inp.value) - 1;
				inp.setAttribute("value", num.toString());
				ctx.onChange(num);
			});
			const plus = container.createSpan({ cls: "clickable-icon" });
			setIcon(plus, "plus");
			plus.addEventListener("click", () => {
				const num = Number(inp.value) + 1;
				inp.setAttribute("value", num.toString());
				ctx.onChange(num);
			});
			const exp = container.createSpan({ cls: "clickable-icon" });
			setIcon(exp, "variable");
			exp.addEventListener("click", () => {
				new ExpressionModal(plugin.app, Number(inp.value), (n) => {
					inp.setAttribute("value", n.toString());
					ctx.onChange(n);
				}).open();
			});
		},
	};
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
					resultEl.classList.remove(
						"properties-plus-plus-text-error"
					);
				} catch (e) {
					updateBtn.setDisabled(true);
					resultEl.textContent = "error";
					resultEl.classList.add("properties-plus-plus-text-error");
				}
			})
		);
	}
}
