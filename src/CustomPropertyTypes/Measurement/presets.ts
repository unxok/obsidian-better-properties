import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";
import { text } from "~/i18next";

export type Unit = {
	name: string;
	shorthand: string;
};

// Map preset keys to translation keys
export const PRESET_TRANSLATION_KEYS: Record<string, string> = {
	length: "customPropertyTypes.measurement.settings.unitPreset.length",
	weight: "customPropertyTypes.measurement.settings.unitPreset.weight",
	volume: "customPropertyTypes.measurement.settings.unitPreset.volume",
	time: "customPropertyTypes.measurement.settings.unitPreset.time",
	temperature: "customPropertyTypes.measurement.settings.unitPreset.temperature",
	area: "customPropertyTypes.measurement.settings.unitPreset.area",
	speed: "customPropertyTypes.measurement.settings.unitPreset.speed",
};

// Unit presets organized by category
export const UNIT_PRESETS: Record<string, Unit[]> = {
	length: [
		{ name: "Millimeter", shorthand: "mm" },
		{ name: "Centimeter", shorthand: "cm" },
		{ name: "Meter", shorthand: "m" },
		{ name: "Kilometer", shorthand: "km" },
		{ name: "Inch", shorthand: "in" },
		{ name: "Foot", shorthand: "ft" },
		{ name: "Yard", shorthand: "yd" },
		{ name: "Mile", shorthand: "mi" },
	],
	weight: [
		{ name: "Milligram", shorthand: "mg" },
		{ name: "Gram", shorthand: "g" },
		{ name: "Kilogram", shorthand: "kg" },
		{ name: "Metric Ton", shorthand: "t" },
		{ name: "Ounce", shorthand: "oz" },
		{ name: "Pound", shorthand: "lb" },
	],
	volume: [
		{ name: "Milliliter", shorthand: "ml" },
		{ name: "Liter", shorthand: "l" },
		{ name: "Teaspoon", shorthand: "tsp" },
		{ name: "Tablespoon", shorthand: "tbsp" },
		{ name: "Fluid Ounce", shorthand: "fl oz" },
		{ name: "Cup", shorthand: "cup" },
		{ name: "Pint", shorthand: "pt" },
		{ name: "Quart", shorthand: "qt" },
		{ name: "Gallon", shorthand: "gal" },
	],
	time: [
		{ name: "Millisecond", shorthand: "ms" },
		{ name: "Second", shorthand: "s" },
		{ name: "Minute", shorthand: "min" },
		{ name: "Hour", shorthand: "h" },
		{ name: "Day", shorthand: "d" },
		{ name: "Week", shorthand: "wk" },
		{ name: "Month", shorthand: "mo" },
		{ name: "Year", shorthand: "yr" },
	],
	temperature: [
		{ name: "Celsius", shorthand: "°C" },
		{ name: "Fahrenheit", shorthand: "°F" },
		{ name: "Kelvin", shorthand: "K" },
	],
	area: [
		{ name: "Square Millimeter", shorthand: "mm²" },
		{ name: "Square Centimeter", shorthand: "cm²" },
		{ name: "Square Meter", shorthand: "m²" },
		{ name: "Square Kilometer", shorthand: "km²" },
		{ name: "Square Inch", shorthand: "in²" },
		{ name: "Square Foot", shorthand: "ft²" },
		{ name: "Square Yard", shorthand: "yd²" },
		{ name: "Acre", shorthand: "acre" },
	],
	speed: [
		{ name: "Meters per Second", shorthand: "m/s" },
		{ name: "Kilometers per Hour", shorthand: "km/h" },
		{ name: "Miles per Hour", shorthand: "mph" },
		{ name: "Knots", shorthand: "kn" },
	],
};

// Preset selection modal
export class PresetSelectionModal extends FuzzySuggestModal<string> {
	private resolvePromise?: (value: string | null) => void;

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Select measurement type");
	}

	getItems(): string[] {
		return Object.keys(UNIT_PRESETS);
	}

	getItemText(item: string): string {
		const translationKey = PRESET_TRANSLATION_KEYS[item];
		if (translationKey) {
			return text(translationKey as "customPropertyTypes.measurement.settings.unitPreset.length");
		}
		return item;
	}

	onChooseItem(item: string, _evt: MouseEvent | KeyboardEvent): void {
		if (this.resolvePromise) {
			this.resolvePromise(item);
			this.resolvePromise = undefined
		}
	}

	onClose(): void {
		super.onClose();
		// onClose gets called before onChooseItem so we need to delay
		setTimeout(() => {
			if (this.resolvePromise) {
				this.resolvePromise(null);
			}
		}, 50)
	}

	renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement): void {
		super.renderSuggestion.call(this, item, el);
		el.empty();
		el.classList.add("mod-complex");
		const presetName = this.getItemText(item.item);
		el.createDiv({ cls: "suggestion-title", text: presetName });
	}

	// Return a promise that resolves when a preset is selected or modal is closed
	async selectPreset(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}
}

