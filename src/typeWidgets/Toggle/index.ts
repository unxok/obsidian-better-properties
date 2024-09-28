import { ToggleComponent } from "obsidian";
import { typeKeySuffixes, typeWidgetPrefix } from "src/lib/constants";
import PropertiesPlusPlus from "src/main";

const shortTypeKey = typeKeySuffixes.toggle;
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = "Toggle";

export const registerToggle = (plugin: PropertiesPlusPlus) => {
	plugin.app.metadataTypeManager.registeredTypeWidgets[fullTypeKey] = {
		icon: "toggle-right",
		default: () => false,
		name: () => name,
		validate: (v) => typeof v === "boolean",
		type: fullTypeKey,
		render: (el, data, ctx) => {
			const container = el
				.createDiv({
					cls: "metadata-input-longtext",
				})
				.createDiv({
					cls: "properties-plus-plus-flex-center properties-plus-plus-w-fit",
				});
			const { value } = data;
			new ToggleComponent(container).setValue(!!value).onChange((b) => {
				ctx.onChange(b);
			});
		},
	};
};
