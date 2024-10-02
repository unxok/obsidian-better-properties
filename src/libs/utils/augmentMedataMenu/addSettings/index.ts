import {
	metdataSectionId,
	typeKeySuffixes,
	typeWidgetPrefix,
} from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { Modal, Setting } from "obsidian";
import { createSection } from "../../setting";
import PropertiesPlusPlus from "@/main";
import { createSliderSettings } from "./Slider";
import { createNumberPlusPlusSettings } from "./NumberPlusPlus";
import { createDropdownSettings } from "./Dropdown";
import { createButtonSettings } from "./Button";
import { IconSuggest } from "@/classes/IconSuggest";

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

export type TypeKeys = PropertySettings;

export type PropertySettings = {
	general: {
		customIcon: string;
	};
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
	button: {
		displayText: string;
		icon: string;
		callbackType: "inlineJs" | "fileJs" | "Command";
		style: "default" | "accent" | "warning" | "destructive" | "ghost";
		bgColor: string;
		textColor: string;
		cssClass: string;
	};
	toggle: {};
	color: {};
	markdown: {};
};

// can't think of a way to have this typed properly but at least this avoids hard coding the keys somewhat
export const defaultPropertySettings: PropertySettings = {
	general: {
		customIcon: "",
	},
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
	[typeKeySuffixes["button"]]: {
		displayText: "click me",
		callbackType: "inlineJs",
		icon: "",
		style: "default",
		bgColor: "",
		textColor: "",
		cssClass: "",
	},
	toggle: {},
	color: {},
	markdown: {},
};

class SettingsModal extends Modal {
	plugin: PropertiesPlusPlus;
	form: PropertySettings;
	property: string;
	constructor(plugin: PropertiesPlusPlus, property: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.property = property;
		const defaultForm = { ...defaultPropertySettings } as PropertySettings;
		const form = plugin.settings.propertySettings[
			property.toLowerCase()
		] ?? {
			defaultForm,
		};
		Object.keys(defaultForm).forEach((k) => {
			const key = k as keyof PropertySettings;
			const defaultValue = defaultForm[key];
			if (!form[key]) {
				// @ts-ignore TODO IDK why typescript doesn't like this
				form[key] = { ...defaultValue };
				return;
			}
			// @ts-ignore TODO IDK why typescript doesn't like this
			form[key] = { ...defaultValue, ...form[key] };
		});
		this.form = form;
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

		this.createGeneral(contentEl, this.form.general, (key, value) => {
			this.updateForm("general", key, value);
			console.log("general updated: ", this.form);
		});

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
			case "button":
				return createButtonSettings(
					contentEl,
					this.form["button"],
					(key, value) => this.updateForm("button", key, value),
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

	createGeneral(
		el: HTMLElement,
		form: typeof this.form.general,
		updateForm: <T extends keyof typeof this.form.general>(
			key: T,
			value: (typeof this.form.general)[T]
		) => void
	): void {
		const { content } = createSection(el, "General", false);

		new Setting(content)
			.setName("Custom icon")
			.setDesc(
				"Set a custom icon to override the default type icon for this property. Leave blank to use the default type icon."
			)
			.addSearch((cmp) =>
				cmp
					.setValue(form.customIcon)
					.onChange((v) => updateForm("customIcon", v))
					.then((cmp) => new IconSuggest(this.app, cmp))
			);
	}
}
