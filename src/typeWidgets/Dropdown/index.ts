import { DropdownComponent } from "obsidian";
import { PropertyEntryData, PropertyRenderContext } from "obsidian-typings";
import { typeKeySuffixes, typeWidgetPrefix } from "@/libs/constants";
import { defaultPropertySettings } from "@/libs/utils/augmentMedataMenu/addSettings";
import PropertiesPlusPlus from "@/main";

const shortTypeKey = typeKeySuffixes["dropdown"];
const fullTypeKey = typeWidgetPrefix + shortTypeKey;
const name = "Dropdown";

export const registerDropdown = (plugin: PropertiesPlusPlus) => {
	const render = (
		el: HTMLElement,
		data: PropertyEntryData<unknown>,
		ctx: PropertyRenderContext
	) => {
		const { options, dynamicFileJs, dynamicInlineJs } = plugin.settings
			.propertySettings[data.key.toLowerCase()]?.[shortTypeKey] ?? {
			...defaultPropertySettings[shortTypeKey],
		};

		const container = el.createDiv({
			cls: "metadata-input-longtext",
		});

		const dropdown = new DropdownComponent(container)
			// .addOptions(optionsObj)
			.setValue(data.value?.toString() ?? "")
			.onChange((v) => ctx.onChange(v));

		(async () => {
			const staticOptionsObj = options.reduce((acc, { label, value }) => {
				acc[value] = label;
				return acc;
			}, {} as Record<string, string>);

			const optionsObjWithInline = getDynamicOptionsInline(
				dynamicInlineJs,
				staticOptionsObj
			);

			const optionsObj = await getDynamicOptionsFile(
				dynamicFileJs,
				optionsObjWithInline,
				plugin
			);

			dropdown.addOptions(optionsObj);
		})();
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

const getDynamicOptionsInline = (
	inlineJs: string,
	obj: Record<string, string>
) => {
	if (!inlineJs) return obj;
	try {
		const dynamicArr: { label: string; value: string }[] = eval(
			`(() => {${inlineJs}})()`
		);
		if (!Array.isArray(dynamicArr)) throw new Error();
		return dynamicArr.reduce(
			(acc, { label, value }) => {
				acc[value] = label;
				return acc;
			},
			{ ...obj }
		);
	} catch (e) {
		const msg =
			"Properties++: Failed to load dynamic options. Check dev console for more details.";
		new Notice(msg);
		console.error(e);
		return obj;
	}
};

const getDynamicOptionsFile = async (
	filePath: string,
	obj: Record<string, string>,
	plugin: PropertiesPlusPlus
) => {
	if (!filePath || !filePath?.toLowerCase()?.endsWith(".js")) return obj;
	const file = plugin.app.vault.getFileByPath(filePath);
	if (!file) {
		new Notice("Properties++: Could not locate JS file from " + filePath);
		return obj;
	}
	const inlineJs = await plugin.app.vault.cachedRead(file);
	return getDynamicOptionsInline(inlineJs, obj);
};
