import PropertiesPlusPlus from "src/main";
import { registerSlider } from "./Slider";
import { registerToggle } from "./Toggle";
import { registerNumberPlusPlus } from "./NumberPlusPlus";
import { registerDropdown } from "./Dropdown";

export const registerCustomWidgets = (plugin: PropertiesPlusPlus) => {
	registerToggle(plugin);
	registerSlider(plugin);
	registerNumberPlusPlus(plugin);
	registerDropdown(plugin);
};
