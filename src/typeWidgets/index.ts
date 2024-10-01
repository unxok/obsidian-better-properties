import PropertiesPlusPlus from "@/main";
import { registerSlider } from "./Slider";
import { registerToggle } from "./Toggle";
import { registerNumberPlusPlus } from "./NumberPlusPlus";
import { registerDropdown } from "./Dropdown";
import { registerColor } from "./Color";
import { registerMarkdown } from "./Markdown";

export const registerCustomWidgets = (plugin: PropertiesPlusPlus) => {
	registerMarkdown(plugin);
	registerDropdown(plugin);
	registerSlider(plugin);
	registerNumberPlusPlus(plugin);
	registerColor(plugin);
	registerToggle(plugin);
};
