import {
	metdataSectionId,
	typeKeySuffixes,
	typeWidgetPrefix,
} from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { Modal, Setting } from "obsidian";
import { createSection } from "../../setting";
import BetterProperties from "@/main";
import { IconSuggest } from "@/classes/IconSuggest";
import { TextColorComponent } from "@/classes/TextColorComponent";
import { createButtonSettings } from "@/typeWidgets/Button";
import { createDropdownSettings } from "@/typeWidgets/Dropdown";
import { createNumberPlusSettings } from "@/typeWidgets/NumberPlus";
import { createSliderSettings } from "@/typeWidgets/Slider";
import {
	defaultPropertySettings,
	PropertySettings,
} from "@/libs/PropertySettings";
import { createStarsSettings } from "@/typeWidgets/Stars";

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

class SettingsModal extends Modal {
	plugin: BetterProperties;
	form: PropertySettings;
	property: string;
	constructor(plugin: BetterProperties, property: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.property = property;
		const defaultForm = { ...defaultPropertySettings };
		const form = plugin.settings.propertySettings[
			property.toLowerCase()
		] ?? {
			...defaultForm,
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

		const btnContainer = contentEl.createEl("p", {
			cls: "better-properties-property-settings-button-container",
		});

		btnContainer
			.createEl("button", {
				text: "export",
				cls: "",
			})
			.addEventListener("click", () => new Notice("TODO"));

		btnContainer
			.createEl("button", {
				text: "import",
				cls: "",
			})
			.addEventListener("click", () => new Notice("TODO"));

		btnContainer
			.createEl("button", {
				text: "reset to default",
				cls: "mod-destructive",
			})
			.addEventListener("click", () => {
				const modal = new Modal(this.app);
				modal.onOpen = () => {
					modal.contentEl.empty();
					modal.setTitle("Are you sure?");
					modal.contentEl.createEl("p", {
						text: "This will permanently reset all settings for this property back to the default. This cannot be undone!",
					});
					new Setting(modal.contentEl)
						.addButton((cmp) =>
							cmp
								.setButtonText("nevermind...")
								.onClick(() => modal.close())
						)
						.addButton((cmp) =>
							cmp
								.setButtonText("do it!")
								.setWarning()
								.onClick(() => {
									this.form = { ...defaultPropertySettings };
									modal.close();
									this.close();
								})
						);
				};
				modal.open();
			});

		this.createGeneral(contentEl, this.form.general, (key, value) => {
			this.updateForm("general", key, value);
		});

		switch (
			typeKey.slice(typeWidgetPrefix.length) as keyof PropertySettings
		) {
			case "slider":
				return createSliderSettings(
					contentEl,
					this.form.slider,
					(key, value) => this.updateForm("slider", key, value)
				);
			case "numberPlus":
				return createNumberPlusSettings(
					contentEl,
					this.form.numberPlus,
					(key, value) => this.updateForm("numberPlus", key, value)
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
			case "stars":
				return createStarsSettings(
					contentEl,
					this.form["stars"],
					(key, value) => this.updateForm("stars", key, value),
					this.plugin
				);
			default:
				new Setting(contentEl)
					.setName("Non customizable type")
					.setDesc(
						"The current type is not customizable by Better Properties"
					);
		}
	}

	async onClose(): Promise<void> {
		const { plugin, property, form } = this;
		const key = property.toLowerCase();
		await plugin.updateSettings((prev) => ({
			...prev,
			propertySettings: { ...prev.propertySettings, [key]: form },
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
		const { content } = createSection(el, "General", true);

		// new Setting(content)
		// 	.setName("CSS classes")
		// 	.setDesc(
		// 		"Add additional CSS classes to the container div (div.metadata-property). To add multiple names, separate each by a space."
		// 	)
		// 	.addText((cmp) =>
		// 		cmp
		// 			.setValue(form.cssClass)
		// 			.onChange((v) => updateForm("cssClass", v))
		// 	);

		new Setting(content)
			.setName("Hidden")
			.setDesc(
				"Turn on to have this property be hidden from the properties editor by default."
			)
			.addToggle((cmp) =>
				cmp
					.setValue(form.hidden)
					.onChange((b) => updateForm("hidden", b))
			);

		new Setting(content)
			.setName("Custom icon")
			.setDesc(
				"Set a custom icon to override the default type icon for this property."
			)
			.addSearch((cmp) =>
				cmp
					.setValue(form.customIcon)
					.onChange((v) => updateForm("customIcon", v))
					.then((cmp) => new IconSuggest(this.app, cmp))
			);

		new Setting(content)
			.setName("Icon color")
			.setDesc(
				"Set a custom color for the type icon. Choose a color from the picker or enter any valid CSS color."
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.iconColor)
					.onChange((v) => updateForm("iconColor", v))
			);

		new Setting(content)
			.setName("Icon hover color")
			.setDesc(
				"Set a custom color for the type icon when hovered. Choose a color from the picker or enter any valid CSS color."
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.iconHoverColor)
					.onChange((v) => updateForm("iconHoverColor", v))
			);

		new Setting(content)
			.setName("Property label color")
			.setDesc(
				"Set a custom color for the property name label. Choose a color from the picker or enter any valid CSS color."
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.labelColor)
					.onChange((v) => updateForm("labelColor", v))
			);

		new Setting(content)
			.setName("Value text color")
			.setDesc(
				"Set a custom color to override the default normal text color in the property value. Choose a color from the picker or enter any valid CSS color."
			)
			.then((cmp) =>
				new TextColorComponent(cmp.controlEl)
					.setValue(form.textColor)
					.onChange((v) => updateForm("textColor", v))
			);
	}
}
