import {
	App,
	ButtonComponent,
	Modal,
	setIcon,
	Setting,
	SliderComponent,
	ToggleComponent,
} from "obsidian";
import { PropertyEntryData, PropertyRenderContext } from "obsidian-typings";
import { typeKeySuffixes, typeWidgetPrefix } from "src/lib/constants";
import { defaultPropertySettings } from "src/lib/utils/augmentMedataMenu/addSettings";
import PropertiesPlusPlus from "src/main";

const shortTypeKey = typeKeySuffixes["number-plus-plus"];
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = "Number++";

export const registerNumberPlusPlus = (plugin: PropertiesPlusPlus) => {
	const render = (
		el: HTMLElement,
		data: PropertyEntryData<unknown>,
		ctx: PropertyRenderContext
	) => {
		const { min, max, step, validate } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.[shortTypeKey] ?? {
			...defaultPropertySettings[shortTypeKey],
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
			cls: "properties-plus-plus-number-plus-plus",
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
			cls: "metadata-input metadata-input-number properties-plus-plus-w-fit",
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
	};

	plugin.app.metadataTypeManager.registeredTypeWidgets[fullTypeKey] = {
		icon: "calculator",
		default: () => 0,
		name: () => name,
		validate: (v) => !Number.isNaN(Number(v)),
		type: fullTypeKey,
		render,
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
