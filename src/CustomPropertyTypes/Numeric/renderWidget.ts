import { TextComponent, ValueComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";
import Mexp from "math-expression-evaluator";
import { syncTryCatch, TryCatchResult } from "~/lib/utils";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new NumericTypeComponent(plugin, el, value, ctx);
};

class NumericTypeComponent extends PropertyWidgetComponentNew<
	"numeric",
	string
> {
	type = "numeric" as const;
	parseValue = (v: unknown) => {
		return v?.toString() ?? "";
	};

	numericComponent: NumericComponent;

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		const settings = this.getSettings();

		this.numericComponent = new NumericComponent(el, settings.decimalPlaces)
			.setValue(this.parseValue(value))
			.onChange((n) => {
				console.log("change");
				this.ctx.onChange(n);
			});

		this.onFocus = () => {
			this.numericComponent.textComponent.inputEl.focus();
		};
	}

	getValue(): string {
		return this.numericComponent.getValue();
	}

	setValue(value: unknown): void {
		if (this.numericComponent.getValue() !== value) {
			this.numericComponent.setValue(this.parseValue(value));
		}
		super.setValue(value);
	}
}

class NumericComponent extends ValueComponent<string> {
	mexp: Mexp = new Mexp();
	textComponent: TextComponent;
	numericContainerEl: HTMLDivElement;
	resultEl: HTMLDivElement;

	value: string | undefined;
	onChangeCallback: (v: string) => void = () => {};
	isTyping: boolean = false;
	showResultAttr: string = "data-better-properties-show-result";

	constructor(containerEl: HTMLElement, public decimalPlaces?: number) {
		super();
		this.numericContainerEl = containerEl.createDiv({
			cls: "better-properties-numeric-container",
		});
		this.textComponent = this.createTextComponent(this.numericContainerEl);
		this.resultEl = this.numericContainerEl.createDiv({
			cls: "better-properties-numeric-result",
		});

		this.setIsTyping(false);
	}

	setIsTyping(isTyping: boolean): void {
		if (this.isTyping === isTyping) return;
		this.isTyping = isTyping;
		this.numericContainerEl.setAttribute(
			this.showResultAttr,
			isTyping ? "true" : "false"
		);
	}

	onChange(cb: (value: string) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	onChanged(): void {
		this.onChangeCallback(this.getValue());
	}

	evaluate(expr: string): TryCatchResult<number> {
		return syncTryCatch(() => {
			return this.mexp.eval(expr, [
				{
					token: "x",
					value: this.getValue(),
					precedence: 0,
					show: "x",
					type: 1,
				},
			]);
		});
	}

	setValue(value: string): this {
		const str =
			this.decimalPlaces !== undefined
				? Number(value).toFixed(this.decimalPlaces)
				: value;
		this.value = str;
		this.textComponent.setValue(str);
		this.resultEl.textContent = "";
		return this;
	}

	getValue(): string {
		return this.value ?? "";
	}

	createTextComponent(containerEl: HTMLElement): TextComponent {
		const cmp = new TextComponent(containerEl);
		cmp.onChange((v) => {
			const { success, data, error } = this.evaluate(v);
			this.resultEl.textContent = success ? data.toString() : error;
		});

		const commitValue = () => {
			const v = cmp.inputEl.value;
			const result = this.evaluate(v);
			if (!result.success) return;
			this.setValue(result.data.toString());
			this.onChanged();
		};

		cmp.inputEl.classList.add("metadata-input", "metadata-input-number");

		cmp.inputEl.addEventListener("click", () => {
			commitValue();
		});

		cmp.inputEl.addEventListener("blur", () => {
			this.setIsTyping(false);
			commitValue();
		});

		cmp.inputEl.addEventListener("keydown", () => {
			this.setIsTyping(true);
		});

		cmp.inputEl.addEventListener("keyup", (e) => {
			if (e.key !== "Enter") return;
			commitValue();
		});

		return cmp;
	}
}
