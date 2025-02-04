import BetterProperties from "@/main";
import { Menu, setIcon } from "obsidian";
import { BlockConfig, SaveBlockConfig } from "../shared";
import { obsidianText } from "@/i18Next/defaultObsidian";
import { openConfigurationModal } from "./renderConfigModal";

type RenderConfigButtonProps = {
	plugin: BetterProperties;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
	elParent: HTMLElement;
};
export const renderConfigButton = ({
	plugin,
	blockConfig,
	saveBlockConfig,
	elParent,
}: RenderConfigButtonProps) => {
	window.setTimeout(() => {
		const newButton = createDiv({
			cls: "edit-block-button",
			attr: {
				"aria-label": "Configure metaview",
			},
		});
		const existingButton = elParent.querySelector(
			"div.edit-block-button"
		) as HTMLElement | null;
		if (!existingButton) {
			throw new Error("Could not find 'edit block button' div");
		}
		newButton.addEventListener("click", (e) => {
			const menu = new Menu()
				.addItem((item) =>
					item
						.setIcon("code-2")
						.setTitle(obsidianText("interface.menu.edit"))
						.onClick(() => existingButton.click())
				)
				.addItem((item) =>
					item
						.setIcon("settings")
						.setTitle("Configure")
						.onClick(() =>
							openConfigurationModal({ plugin, blockConfig, saveBlockConfig })
						)
				);

			menu.showAtMouseEvent(e);
		});

		setIcon(newButton, "settings");

		existingButton.style.setProperty("display", "none");
		existingButton.insertAdjacentElement("afterend", newButton);
	}, 0);
};
