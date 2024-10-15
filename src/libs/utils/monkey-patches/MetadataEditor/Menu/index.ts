import { monkeyAroundKey } from "@/libs/constants";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import { Menu } from "obsidian";

export const patchMenu = (plugin: BetterProperties) => {
	const removePatch = around(Menu.prototype, {
		showAtMouseEvent(old) {
			return dedupe(monkeyAroundKey, old, function (e) {
				// @ts-ignore Doesn't look like there's a way to get this typed correctly
				const that = this as Menu;
				const exit = () => {
					return old.call(that, e);
				};
				const { currentTarget } = e;
				const isMetadataPropertyIcon =
					currentTarget instanceof HTMLElement &&
					currentTarget.tagName.toLowerCase() === "span" &&
					currentTarget.classList.contains("metadata-property-icon");

				if (!isMetadataPropertyIcon) return exit();

				const container = currentTarget.closest(
					"div.metadata-property[data-property-key]"
				)!;
				const property =
					container.getAttribute("data-property-key") ?? "";
				// plugin.setMenu(that, trueTarget);
				plugin.app.workspace.trigger(
					"file-property-menu",
					that,
					property
				);

				return exit();
			});
		},
	});

	plugin.register(removePatch);
};
