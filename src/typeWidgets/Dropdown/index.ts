import { DropdownComponent } from "obsidian";
import { PropertyEntryData, PropertyRenderContext } from "obsidian-typings";
import { typeKeySuffixes, typeWidgetPrefix } from "src/lib/constants";
import { defaultPropertySettings } from "src/lib/utils/augmentMedataMenu/addSettings";
import PropertiesPlusPlus from "src/main";

const shortTypeKey = typeKeySuffixes["dropdown"];
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = "Dropdown";

export const registerDropdown = (plugin: PropertiesPlusPlus) => {
	const render = (
		el: HTMLElement,
		data: PropertyEntryData<unknown>,
		ctx: PropertyRenderContext
	) => {
		const { options } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.[shortTypeKey] ?? {
			...defaultPropertySettings[shortTypeKey],
		};

		const optionsObj = options.reduce((acc, { label, value }) => {
			acc[value] = label;
			return acc;
		}, {} as Record<string, string>);

		const container = el.createDiv({
			cls: "metadata-input-longtext",
		});

		new DropdownComponent(container)
			.addOptions(optionsObj)
			.setValue(data.value?.toString() ?? "")
			.onChange((v) => ctx.onChange(v));
	};

	plugin.app.metadataTypeManager.registeredTypeWidgets[fullTypeKey] = {
		icon: "chevron-down-circle",
		default: () => "",
		name: () => name,
		validate: (v) => typeof v === "string",
		type: fullTypeKey,
		render,
	};
};
