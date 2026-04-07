import { DropdownComponent, TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import { PropertyWidgetComponentNew } from "../utils";
import BetterProperties from "~/main";
import { PropertyRenderContext } from "obsidian-typings";
import { PresetSelectionModal, UNIT_PRESETS } from "./presets";
import { setPropertyTypeSettings } from "../utils";

type MeasurementValue = { value: number | null; unit: string } | null;
type MeasurementSettings = { units?: Array<{ name: string; shorthand: string }>, defaultUnit?: string };

const UNKNOWN_UNIT = "Unknown";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	value,
	ctx,
}) => {
	return new MeasurementTypeComponent(plugin, el, value, ctx);
};

class MeasurementTypeComponent extends PropertyWidgetComponentNew<"measurement", MeasurementValue> {
	type = "measurement" as const;

	parseValue = (v: unknown): MeasurementValue => {
		if (v == null || typeof v !== "object") {
			if(typeof v === "number") {
				return { value: v, unit: this.defaultUnit }
			} else if (typeof v === "string" && Number(v)) {
				return { value: Number(v), unit: this.defaultUnit }
			}
			return null;
		}

		const maybe = v as { value?: unknown; unit?: unknown };
		if (maybe.value == null && maybe.unit == null) {
			return null;
		}

		return {
			value: maybe.value != null && maybe.value !== '' ? Number(maybe.value) : null,
			unit: maybe.unit != null && typeof maybe.unit === "string" ? maybe.unit : this.defaultUnit
		};
	};

	numberComponent!: TextComponent;
	unitComponent!: DropdownComponent;
	displayEl!: HTMLDivElement;
	editContainer!: HTMLDivElement;
	units: Record<string, string> = {};
	defaultUnit!: string;
	isEditing = false;

	constructor(
		plugin: BetterProperties,
		container: HTMLElement,
		initial: unknown,
		ctx: PropertyRenderContext
	) {
		super(plugin, container, initial, ctx);

		this.createDisplayView(container);
		this.createEditContainer(container);
		this.onFocus = () => { this.enterEditMode() };
		this.initializeUnits();
	}

	private createDisplayView(el: HTMLElement) {
		this.displayEl = el.createDiv();
		this.displayEl.addClasses(['better-properties-measurement-display','metadata-input-longtext']);
		this.displayEl.addEventListener("click", () => {
			this.enterEditMode();
		});
	}

	private createEditContainer(el: HTMLElement) {
		this.editContainer = el.createDiv();
		this.editContainer.addClass('better-properties-measurement-container');
		this.editContainer.style.display = "none"; // Initially Hidden
		this.createNumberComponent();
		this.createUnitComponent();
	}

	private createNumberComponent() {
		const numberEl = this.editContainer.createDiv({ cls: "better-properties-measurement-number" });
		this.numberComponent = new TextComponent(numberEl);
		this.numberComponent.inputEl.type = "number";
		
		// Add event listener to adjust width on input
		this.numberComponent.inputEl.addEventListener("input", () => {
			this.adjustInputWidth();
		});

		// Handle blur to exit edit mode
		this.numberComponent.inputEl.addEventListener("blur", () => {
			setTimeout(() => {
				if(document.activeElement !== this.unitComponent.selectEl) {
					this.exitEditMode();
				}
			}, 100);
		});

		// Handle Enter key to exit edit mode
		this.numberComponent.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.exitEditMode();
			}
		});

		this.numberComponent.onChange(() => this.commit());
	}

	private createUnitComponent() {
		const unitEl = this.editContainer.createDiv({ cls: "better-properties-measurement-select" });

		this.unitComponent = new DropdownComponent(unitEl);

		// Handle blur on dropdown to exit edit mode
		this.unitComponent.selectEl.addEventListener("blur", () => {
			// Use a small timeout to check if focus moved to the input
			setTimeout(() => {
				if (document.activeElement !== this.numberComponent.inputEl) {
					this.exitEditMode();
				}
			}, 100);
		});

		this.unitComponent.onChange(() => this.commit());
	}

	private async initializeUnits(): Promise<void> {
		const settings = this.getSettings();
		
		// Load units (may prompt for preset if empty)
		this.units = await this.loadUnits(settings);
		this.defaultUnit = settings?.defaultUnit || UNKNOWN_UNIT;
		this.updateUnitComponent();
		this.initializeValues(this.value);
		this.adjustInputWidth();
		this.updateDisplay();
	}

	private async loadUnits(settings: MeasurementSettings): Promise<Record<string, string>> {
		if (!settings?.units || settings.units.length === 0) {
			const modal = new PresetSelectionModal(this.plugin.app);
			const presetKey = (await modal.selectPreset()) ?? 'length';
			settings.units = UNIT_PRESETS[presetKey]
		}
		
		setPropertyTypeSettings({
			plugin: this.plugin,
			property: this.ctx.key,
			type: "measurement",
			typeSettings: settings,
		});
		
		// Units already configured, convert to the format we need
		return settings.units.reduce((acc, unit) => {
			acc[unit.name] = unit.shorthand;
			return acc;
		}, {} as Record<string, string>);
	}

	private updateUnitComponent(): void {
		// Clear existing options
		this.unitComponent.selectEl.innerHTML = "";
		this.addUnitComponentPlaceholder()
		
		// Add unit options
		Object.keys(this.units).forEach((unit) => {
			this.unitComponent.addOption(unit, unit);
		});
	}

	private addUnitComponentPlaceholder() {
		const placeholder = document.createElement("option");
		placeholder.value = "Unknown";
		placeholder.disabled = true;
		placeholder.selected = true;
		placeholder.hidden = true;
		placeholder.innerText = "Unit";
		this.unitComponent.selectEl.prepend(placeholder);
	}

	private initializeValues(initial: unknown) {
		const parsed = this.parseValue(initial);
		if (parsed != null && parsed.value != null) {
			this.numberComponent.setValue(`${parsed.value}`);
		}
		this.unitComponent.setValue(parsed?.unit ?? this.defaultUnit);
	}

	private enterEditMode(): void {
		if (this.isEditing) return;
		this.isEditing = true;
		this.displayEl.style.display = "none";
		this.editContainer.style.display = "";
		this.numberComponent.inputEl.focus();
	}

	private exitEditMode(): void {
		if (!this.isEditing) return;
		this.normalizeInput();
		this.isEditing = false;
		this.displayEl.style.display = "";
		this.editContainer.style.display = "none";
		this.updateDisplay();
	}

	private normalizeInput() {
		// Normalize the input value (removes leading 0s, trailing dots, etc)
		const parsed = this.parseValue(this.getValue());
		if(parsed != null && parsed.value != null) {
			this.numberComponent.setValue(`${parsed.value}`);
			this.adjustInputWidth();
			this.unitComponent.setValue(parsed.unit);
		}
	}

	private updateDisplay(): void {
		const parsed = this.parseValue(this.getValue());
		const settings = this.getSettings();
		
		if (parsed == null || parsed.value == null) {
			this.displayEl.textContent = "";
			return;
		}
		
		const displayValue = parsed.value;
		const shorthand = this.units[parsed.unit] ?? (settings?.units?.find(u => u.name === parsed.unit)?.shorthand ?? "");
		this.displayEl.textContent = `${displayValue}${shorthand}`;
	}

	private adjustInputWidth(): void {
		const input = this.numberComponent.inputEl;
		const value = input.value || input.placeholder || "0";
		
		// Create a temporary element to measure text width
		const temp = document.createElement("span");
		temp.style.visibility = "hidden";
		temp.style.position = "absolute";
		temp.style.fontSize = getComputedStyle(input).fontSize;
		temp.style.fontFamily = getComputedStyle(input).fontFamily;
		temp.style.fontWeight = getComputedStyle(input).fontWeight;
		temp.style.letterSpacing = getComputedStyle(input).letterSpacing;
		temp.textContent = value;
		
		document.body.appendChild(temp);
		const width = temp.getBoundingClientRect().width;
		document.body.removeChild(temp);
		
		// Set width with some padding, respecting min/max constraints
		const minWidth = parseFloat(getComputedStyle(input).minWidth) || 0;
		const maxWidth = parseFloat(getComputedStyle(input).maxWidth) || Infinity;
		const newWidth = Math.max(minWidth, Math.min(maxWidth, width + 18)); // 18px padding
		
		input.style.width = `${newWidth}px`;
	}

	private commit(): void {
		const number = this.numberComponent.getValue();
		const unit = this.unitComponent.getValue();

		if (number == null || unit == null) {
			return;
		}

		// Reset property value when input values are empty
		if(number === '' && (unit === '' || unit === null || unit === undefined || unit === this.defaultUnit)) {
			this.resetValue();
			return;
		}
		this.setValue({ value: number === '' ? null : Number(number), unit: unit });
		if (this.isEditing) {
			this.updateDisplay();
		}
	}

	private resetValue() {
		this.numberComponent.setValue('');
		this.unitComponent.setValue(this.defaultUnit);
		// Explicitly call with `null` to reset value
		super.setValue(null);
	}

	getValue(): MeasurementValue {
		const value = this.numberComponent.getValue();
		const unit = this.unitComponent.getValue();
		return {
			value: value == null || value === '' ? null : Number(value),
			unit: unit,
		};
	}

	setValue(v: unknown): void {
		const parsed = this.parseValue(v);
		const current = this.getValue();
		if(parsed == null || current == null) {
			return;
		}
		
		if (current.value !== parsed.value) {
			this.numberComponent.setValue(`${parsed.value}`);
			this.adjustInputWidth();
		}
		if (current.unit !== parsed.unit) {
			this.unitComponent.setValue(parsed.unit);
		}

		super.setValue(parsed);

		// Update display if not in edit mode
		if (!this.isEditing) {
			this.updateDisplay();
		}
	}
}