import { ReorderSettingGroup } from "#/classes/ReorderSettingGroup";
import { BetterProperties } from "#/Plugin";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { renderManualOptionSetting } from "./renderManualOptionSetting";
import { Settings } from "./types";
import { Menu } from "obsidian";
import { getRandomColor } from "./getRandomColor";
import { arrayMove } from "~/lib/utils";
import { text } from "#/i18n";
import { obsidianText } from "~/i18next/obsidian";

export const renderManualSettings = ({
	plugin,
	containerEl,
	settings,
	updateSettings,
	reRenderModal,
}: {
	plugin: BetterProperties;
	containerEl: HTMLElement;
	settings: Settings;
	updateSettings: (cb: (s: Settings) => Settings) => Promise<void>;
	reRenderModal: () => void;
}) => {
	const manualOptionsSettingGroup = new ReorderSettingGroup(
		containerEl
	).setHeading(text("select.settings.manualHeading"));

	settings.manualOptions.forEach((option, index) => {
		renderManualOptionSetting({
			plugin,
			settings,
			updateSettings,
			reRenderModal,
			option,
			index,
			manualOptionsSettingGroup,
		});
	});

	manualOptionsSettingGroup
		.addExtraButton((button) => {
			button
				.setIcon("lucide-trash")
				.setTooltip(text("select.settings.manualRemoveAllTooltip"))
				.onClick(() => {
					const subModal = new ConfirmationModal(plugin.app);

					subModal.setTitle(text("select.settings.manualRemoveAllModalTitle"));
					subModal.contentEl.createEl("p", {
						text: text("select.settings.manualRemoveAllModalDesc"),
					});
					subModal
						.addFooterButton((button) => {
							button
								.setButtonText(obsidianText("dialogue.button-cancel"))
								.onClick(() => {
									subModal.close();
								});
						})
						.addFooterButton((button) => {
							button
								.setButtonText(obsidianText("dialogue.button-confirm"))
								.setWarning()
								.onClick(async () => {
									subModal.close();
									await updateSettings((prev) => ({
										...prev,
										manualOptions: [],
									}));
									reRenderModal();
								});
						});

					subModal.open();
				});
		})
		.addExtraButton((button) => {
			button
				.setIcon("lucide-arrow-down-az")
				.setTooltip(text("select.settings.manualSortTooltip"));

			button.extraSettingsEl.addEventListener("click", (e) => {
				const menu = new Menu()
					.setNoIcon()
					.addItem((item) => {
						item
							.setTitle(text("select.settings.manualSortValueAZ"))
							.onClick(async () => {
								await updateSettings((prev) => ({
									...prev,
									manualOptions: prev.manualOptions.toSorted((a, b) =>
										a.value.localeCompare(b.value)
									),
								}));
								reRenderModal();
							});
					})
					.addItem((item) => {
						item
							.setTitle(text("select.settings.manualSortValueZA"))
							.onClick(async () => {
								await updateSettings((prev) => ({
									...prev,
									manualOptions: prev.manualOptions.toSorted((a, b) =>
										b.value.localeCompare(a.value)
									),
								}));
								reRenderModal();
							});
					})
					.addItem((item) => {
						item
							.setTitle(text("select.settings.manualSortLabelAZ"))
							.onClick(async () => {
								await updateSettings((prev) => ({
									...prev,
									manualOptions: prev.manualOptions.toSorted((a, b) =>
										(a.label ?? "").localeCompare(b.label ?? "")
									),
								}));
								reRenderModal();
							});
					})
					.addItem((item) => {
						item
							.setTitle(text("select.settings.manualSortLabelZA"))
							.onClick(async () => {
								await updateSettings((prev) => ({
									...prev,
									manualOptions: prev.manualOptions.toSorted((a, b) =>
										(b.label ?? "").localeCompare(a.label ?? "")
									),
								}));
								reRenderModal();
							});
					});

				menu.showAtMouseEvent(e);
			});
		})
		.addExtraButton((button) =>
			button
				.setIcon("lucide-plus-circle")
				.setTooltip(text("select.settings.manualCreateTooltip"))
				.onClick(async () => {
					await updateSettings((prev) => ({
						...prev,
						manualOptions: [
							...prev.manualOptions,
							{
								value: "",
								background: getRandomColor({
									plugin,
									options: prev.manualOptions,
								}),
							},
						],
					}));
					reRenderModal();
				})
		);

	manualOptionsSettingGroup.onReorder(async (from, to) => {
		if (from === to) return;
		await updateSettings((prev) => ({
			...prev,
			manualOptions: arrayMove(prev.manualOptions, from, to),
		}));
		reRenderModal();
	});
};
