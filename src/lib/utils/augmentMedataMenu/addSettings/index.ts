import {
	metdataSectionId,
	typeKeySuffixes,
	typeWidgetPrefix,
} from "src/lib/constants";
import { MetadataAddItemProps } from "..";
import { App, Modal, setIcon, Setting } from "obsidian";
import { createSection } from "../../setting";
import PropertiesPlusPlus from "src/main";
import { createSliderSettings } from "./Slider";
import { createNumberPlusPlusSettings } from "./NumberPlusPlus";
import { createDropdownSettings } from "./Dropdown";

export const addSettings = ({ menu, plugin, key }: MetadataAddItemProps) => {
	menu.addItem((item) =>
		item
			.setSection(metdataSectionId)
			.setIcon("wrench")
			.setTitle("Settings")
			.onClick(() => {
				new SettingsModal(plugin, key).open();
			})
	);
};

// type PropertySettingsItem<T extends keyof typeof typeKeySuffixes> = Record<T, Record<string, any>>;

export type PropertySettings = {
	slider: {
		min: number;
		max: number;
		step: number;
		showLabels: boolean;
	};
	"number-plus-plus": {
		min: number;
		max: number;
		step: number;
		validate: boolean;
	};
	dropdown: {
		options: { value: string; label: string }[];

		dynamicInlineJs: string;
		dynamicFileJs: string;
	};
};

// can't think of a way to have this typed properly but at least this avoids hard coding the keys somewhat
export const defaultPropertySettings: PropertySettings = {
	[typeKeySuffixes["slider"]]: {
		min: 0,
		max: 100,
		step: 1,
		showLabels: true,
	},
	[typeKeySuffixes["number-plus-plus"]]: {
		min: 0,
		max: 100000,
		step: 1,
		validate: true,
	},
	[typeKeySuffixes["dropdown"]]: {
		options: [
			{ label: "Apples", value: "apples" },
			{ label: "Oranges", value: "oranges" },
			{ label: "Bananas", value: "bananas" },
		],
		dynamicInlineJs: "",
		dynamicFileJs: "",
	},
};

class SettingsModal extends Modal {
	plugin: PropertiesPlusPlus;
	form: PropertySettings;
	property: string;
	constructor(plugin: PropertiesPlusPlus, property: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.property = property;
		this.form = plugin.settings.propertySettings[
			property.toLowerCase()
		] ?? {
			...defaultPropertySettings,
		};
	}

	updateForm<
		T extends keyof PropertySettings,
		K extends keyof PropertySettings[T]
	>(type: T, key: K, value: PropertySettings[T][K]): void {
		this.form[type][key] = value;
	}

	onOpen(): void {
		const { contentEl, property } = this;
		const typeKey =
			this.app.metadataTypeManager.getPropertyInfo(property.toLowerCase())
				?.type ?? "";

		contentEl.empty();
		this.setTitle('Settings for "' + property + '"');

		this.createGeneral(contentEl);

		switch (
			typeKey.slice(
				typeWidgetPrefix.length
			) as keyof typeof typeKeySuffixes
		) {
			case "slider":
				return createSliderSettings(
					contentEl,
					this.form.slider,
					(key, value) => this.updateForm("slider", key, value)
				);
			case "number-plus-plus":
				return createNumberPlusPlusSettings(
					contentEl,
					this.form["number-plus-plus"],
					(key, value) =>
						this.updateForm("number-plus-plus", key, value)
				);
			case "dropdown":
				return createDropdownSettings(
					contentEl,
					this.form["dropdown"],
					(key, value) => this.updateForm("dropdown", key, value),
					this.plugin
				);
			default:
				new Setting(contentEl)
					.setName("Non customizable type")
					.setDesc(
						"The current type is not customizable by Properties++"
					);
		}
	}

	async onClose(): Promise<void> {
		const { plugin, property, form } = this;
		const key = property.toLowerCase();
		await plugin.updateSettings((prev) => ({
			...prev,
			propertySettings: { [key]: form },
		}));
		plugin.refreshPropertyEditor(key);
	}

	createGeneral(el: HTMLElement): void {
		const { content } = createSection(el, "General", false);
		new Setting(content)
			.setName("Nothing")
			.setDesc("Nothing to see here...(yet)")
			.addText((cmp) => cmp.setPlaceholder("uwu"));
	}
}
