import { DropdownComponent, Setting } from "obsidian";
import { CustomPropertyType } from "../types";
import { text } from "~/i18next";
import { typeKey } from "./index";
import { getPropertyTypeSettings, setPropertyTypeSettings } from "../utils";
import { ListSetting } from "~/classes/ListSetting";
import { Icon } from "~/lib/types/icons";
import { PresetSelectionModal, UNIT_PRESETS } from "./presets";

type MeasurementSettings = NonNullable<ReturnType<typeof getPropertyTypeSettings<typeof typeKey>>>;
type Unit = NonNullable<MeasurementSettings["units"]>[number];

export const renderSettings: CustomPropertyType["renderSettings"] = ({
	modal,
	plugin,
	property,
}) => {
	const { tabContentEl: parentEl } = modal;
	const settings = getPropertyTypeSettings({
		plugin,
		property,
		type: typeKey,
	});

	// Check if this is a new measurement property (no units configured)
	const isNewProperty = !settings.units || settings.units.length === 0;
	
	// Initialize with empty array if new (we'll prompt for preset)
	if (isNewProperty) {
		settings.units = [];
		setPropertyTypeSettings({
			plugin,
			property,
			type: typeKey,
			typeSettings: settings,
		});
	}

	modal.onTabChange(() => {
		
		// Filter out units with empty string as their name
		settings.units = settings.units?.filter(unit => unit.name.trim() !== "") || [];

		setPropertyTypeSettings({
			plugin,
			property,
			type: typeKey,
			typeSettings: settings,
		});
	});

	let defaultUnitDropdown: DropdownComponent | null = null;

	const updateDefaultUnitDropdown = () => {
		if (!defaultUnitDropdown) return;
		defaultUnitDropdown.selectEl.innerHTML = "";
		defaultUnitDropdown.addOption("Unknown", text("customPropertyTypes.measurement.settings.defaultUnit.none"));
		
		// Add existing units
		let isDefaultUnitValid = false;
		const units = settings.units;
		if (units) {
			for (const unit of units) {
				defaultUnitDropdown.addOption(unit.name, unit.name);
				if(unit.name === settings.defaultUnit) {
					isDefaultUnitValid = true;
				}
			}
		}
		
		if(isDefaultUnitValid) {
			defaultUnitDropdown.setValue(settings.defaultUnit ?? "Unknown");
		} else {
			// Reset Default Unit value, possibly because it was deleted from list
			settings.defaultUnit = undefined;
		}
	};

	new Setting(parentEl)
		.setName(text("customPropertyTypes.measurement.settings.defaultUnit.title"))
		.addDropdown((dropdown) => {
			defaultUnitDropdown = dropdown;
			updateDefaultUnitDropdown();
			
			dropdown.onChange((value) => {
				settings.defaultUnit = value === "Unknown" ? undefined : value;
			});
		});

	const list = new ListSetting<Unit>(parentEl)
		.setName(text("customPropertyTypes.measurement.settings.units.title"))
		.setDesc(text("customPropertyTypes.measurement.settings.units.desc"))
		.setValue(settings.units ?? [])
		.onChange((v) => {
			settings.units = [...v];
			updateDefaultUnitDropdown();
		})
		.onCreateItem((unit, item) => {
			if (unit === undefined || item === undefined) {
				throw new Error("onCreateItem called with undefined");
			}
			const { name, shorthand } = unit;
			item
				.addDragButton()
				.addText((txt) =>
					txt
						.setPlaceholder(text("customPropertyTypes.measurement.settings.units.namePlaceholder"))
						.setValue(name)
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							const oldName = matched.name;
							matched.name = v;
							// If the default unit was set to the old name, update it to the new name
							if (settings.defaultUnit === oldName) {
								settings.defaultUnit = v;
							}
							updateDefaultUnitDropdown();
						})
						.then((inp) => item.onFocus(() => inp.inputEl.focus()))
				)
				.addText((txt) =>
					txt
						.setPlaceholder(text("customPropertyTypes.measurement.settings.units.shorthandPlaceholder"))
						.setValue(shorthand)
						.onChange((v) => {
							const matched = list.value[item.index];
							if (matched === undefined) return;
							matched.shorthand = v;
						})
				)
				if(settings.units) {
					const validUnits = settings.units.filter(unit => unit.name.trim() !== "")
					if(validUnits.length > 1) {
						item.addDeleteButton()
					}
				}
			
			// Focus item only if new item being created
			if (name === '') {
				item.focusCallback();
			}
		})
		.renderAllItems()
		.addFooterButton((btn) =>
			btn
				.setButtonText(text("customPropertyTypes.measurement.settings.unitPreset.loadButton" as "customPropertyTypes.measurement.settings.unitPreset.length"))
				.setIcon("lucide-package" satisfies Icon)
				.setCta()
				.onClick(async () => {
					const modal = new PresetSelectionModal(plugin.app);
					const presetKey = await modal.selectPreset()
					if(presetKey) {
						applyPreset(presetKey)
					}
				})
		)
		.addFooterButton((btn) =>
			btn
				.setButtonText(text("customPropertyTypes.measurement.settings.units.addButton"))
				.setIcon("lucide-plus" satisfies Icon)
				.setCta()
				.onClick(() => {
					list.addItem({ name: "", shorthand: "" });
				})
		);

	// Function to apply preset
	const applyPreset = (presetKey: string) => {
		if (!UNIT_PRESETS[presetKey]) return;
		
		const presetUnits = UNIT_PRESETS[presetKey];
		settings.units = [...presetUnits];
		list.setValue(settings.units);
		list.renderAllItems();
		updateDefaultUnitDropdown();
	};
};


