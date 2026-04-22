import { BetterProperties } from "#/Plugin";
import { BetterPropertiesSettings } from "#/Plugin/settings";
import { Modal, Setting, SettingGroup } from "obsidian";
import { SelectOption, StandardSelectSettings } from "./types";
import { ComboboxComponent } from "#/classes/ComboboxComponent";
import { ColorTextComponent } from "#/classes/ColorTextComponent";
import { t } from "#/i18n";

/**
 * Renders an individual manually-defined Select option
 */
export const renderManualOptionSetting = ({
	plugin,
	settings,
	updateSettings,
	reRenderModal,
	option,
	index,
	manualOptionsSettingGroup,
}: {
	plugin: BetterProperties;
	settings: StandardSelectSettings;
	updateSettings: (
		cb: (s: StandardSelectSettings) => StandardSelectSettings
	) => Promise<void>;
	reRenderModal: () => void;
	option: SelectOption;
	index: number;
	manualOptionsSettingGroup: SettingGroup;
}) => {
	manualOptionsSettingGroup.addSetting((s) => {
		s.setNoInfo();
		s.addText((textComponent) => {
			textComponent
				.setPlaceholder(t("common.valuePlaceholder"))
				.setValue(option.value)
				.onChange(async (v) => {
					await updateSettings((prev) => {
						const copy = { ...prev };
						copy.manualOptions[index] = {
							...prev.manualOptions[index],
							value: v,
						};
						return copy;
					});
				});
		}).addText((textComponent) => {
			textComponent
				.setPlaceholder(t("select.settings.manualLabelPlaceholder"))
				.setValue(option.label ?? "")
				.onChange(async (v) => {
					await updateSettings((prev) => {
						const copy = { ...prev };
						copy.manualOptions[index] = {
							...prev.manualOptions[index],
							label: v,
						};
						return copy;
					});
				});
		});

		type Color =
			BetterPropertiesSettings["appearanceSettings"]["colors"][number];

		const combobox = new ComboboxComponent<Color, string>(
			plugin,
			s.controlEl,
			""
		)
			.getOptions((q) => {
				const {
					appearanceSettings: { colors },
				} = plugin.getSettings();

				if (!q) return colors;
				const lower = q.toLowerCase();
				return colors.filter((c) => c.name.toLowerCase().includes(lower));
			})
			.onChange(async (v) => {
				await updateSettings((prev) => {
					const {
						appearanceSettings: { colors },
					} = plugin.getSettings();
					const matchedColor = colors.find((c) => c.background === v);
					if (!matchedColor) return prev;

					const copy = { ...prev };
					copy.manualOptions[index] = {
						...prev.manualOptions[index],
						background: matchedColor.background,
					};
					return copy;
				});
			})
			.parseSuggestion((c) => {
				return { title: c.name };
			});

		const updateClickable = (color: Color) => {
			combobox.clickableEl.textContent = color.name;
			combobox.clickableEl.setCssProps({
				"--better-properties--select-background": color.background,
			});
		};

		combobox.getValueFromOption = (opt) => {
			return opt.background;
		};

		combobox.onSelect((opt) => {
			updateClickable(opt);
			combobox.controlEl.focus();
		});

		const {
			appearanceSettings: { colors },
		} = plugin.getSettings();

		const matchedColor = settings.manualOptions[index].background
			? colors.find(
					(c) => c.background === settings.manualOptions[index].background
			  ) ?? {
					name: "custom",
					background: settings.manualOptions[index].background,
			  }
			: colors[0];
		updateClickable(matchedColor);

		combobox.clickableEl.classList.add("better-properties--select-badge");

		combobox.searchSuggest.onRenderSuggestion((color, el) => {
			const titleEl = el.querySelector(".suggestion-title");
			if (!(titleEl instanceof HTMLElement)) return;
			titleEl.classList.add("better-properties--select-badge");
			titleEl.setCssProps({
				"--better-properties--select-background": color.background,
			});
		});

		combobox.searchSuggest.addFooterItem({
			icon: "lucide-paintbrush",
			title: t("select.settings.manualCustomColorModalTitle"),
			// TODO aux: "Alt + Enter",
			onClick: () => {
				const colorModal = new Modal(plugin.app);

				colorModal.onOpen = () => {
					new Setting(colorModal.contentEl)
						.setName(t("select.settings.manualCustomColorModalTitle"))
						.setDesc(t("select.settings.manualCustomColorModalDesc"))
						.then((s) => {
							new ColorTextComponent(s.controlEl)
								.setValue(matchedColor.background)
								.onChange(async (v) => {
									await updateSettings((prev) => {
										const copy = { ...prev };
										copy.manualOptions[index] = {
											...copy.manualOptions[index],
											background: v,
										};
										return copy;
									});
								});
						});
				};

				colorModal.onClose = () => {
					reRenderModal();
				};

				colorModal.open();
			},
		});

		s.addExtraButton((button) => {
			button.extraSettingsEl.classList.add("better-properties--close");
			button
				.setIcon("lucide-x")
				.setTooltip(t("select.settings.manualRemoveTooltip"))
				.onClick(async () => {
					await updateSettings((prev) => {
						const copy = { ...prev };
						copy.manualOptions = copy.manualOptions.filter(
							(_, i) => i !== index
						);
						return copy;
					});
					reRenderModal();
				});
		});
	});
};
