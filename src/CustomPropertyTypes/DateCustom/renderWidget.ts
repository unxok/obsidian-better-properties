import { moment, setIcon } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import { obsidianText } from "~/i18next/obsidian";
import { PropertyRenderContext } from "obsidian-typings";
import BetterProperties from "~/main";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	return new DateTypeComponent(plugin, el, value, ctx);
};

class DateTypeComponent extends PropertyWidgetComponentNew<
	"datecustom",
	string
> {
	type = "datecustom" as const;
	parseValue = (v: unknown) => v?.toString() ?? "";

	inputEl: HTMLInputElement | undefined;
	formatEl: HTMLDivElement | undefined;
	value: string;
	rawFormat: string = "";

	constructor(
		plugin: BetterProperties,
		el: HTMLElement,
		value: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, el, value, ctx);

		this.value = this.parseValue(value);
		this.render();

		this.onFocus = () => {
			this.inputEl?.focus();
		};
	}

	render(): void {
		this.containerEl.empty();
		const settings = this.getSettings();
		const isEmptyAttr = "data-better-properties-is-empty";

		const format = settings.format ?? "YYYY-MM-DD";
		const placeholder =
			settings.placeholder ?? obsidianText("interface.empty-state.empty");
		const icon = settings.icon ?? "lucide-calendar";
		const inputType = settings.type ?? "date";
		this.rawFormat = inputType === "date" ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm";
		const max = inputType === "date" ? "9999-12-31" : "9999-12-31T23:59";

		const parsed = !this.value
			? undefined
			: moment(this.parseValue(this.value));

		const buttonContainer = this.containerEl.createDiv({
			cls: "better-properties-datecustom-button-container",
		});

		this.inputEl = buttonContainer.createEl("input", {
			type: inputType,
			attr: {
				"max": max,
				"placeholder": obsidianText("interface.empty-state.empty"),
				"aria-hidden": "true",
			},
		});

		const buttonEl = buttonContainer.createDiv({
			cls: "better-properties-datecustom-button clickable-icon",
			attr: {
				role: "button",
				tabindex: "0",
			},
		});
		setIcon(buttonEl, icon);
		buttonEl.addEventListener("click", () => {
			this.inputEl?.showPicker();
		});
		buttonEl.addEventListener("keydown", (e) => {
			if (e.key !== " ") return;
			this.inputEl?.showPicker();
		});

		this.formatEl = this.containerEl.createDiv({
			cls: "better-properties-datecustom-format metadata-input-longtext",
			text: parsed?.format(format) ?? placeholder,
			attr: {
				[isEmptyAttr]: !this.value || null,
			},
		});

		this.inputEl.addEventListener("change", (e) => {
			const v = (e.target as HTMLInputElement).value;
			if (!v && this.formatEl) {
				this.formatEl.textContent = placeholder;
				this.formatEl.setAttribute(isEmptyAttr, "true");
				this.setValue(null);
				return;
			}
			const date = moment(v?.toString());
			if (date.isValid() && this.formatEl) {
				this.formatEl.removeAttribute(isEmptyAttr);
				this.formatEl.textContent = date.format(format);
			}
			this.setValue(date.format(this.rawFormat));
		});
	}

	getValue(): string {
		return this.inputEl?.value ?? "";
	}

	setValue(value: unknown): void {
		super.setValue(value);

		const dateStr = moment(this.parseValue(value)).format(this.rawFormat);

		if (this.inputEl && this.inputEl?.value !== dateStr) {
			this.render();
		}
	}
}
