import { around, dedupe } from "monkey-around";
import { Menu } from "obsidian";
import { monkeyAroundKey } from "~/lib/constants";
import { BetterProperties } from "~/Plugin/plugin";

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
				const property = container.getAttribute("data-property-key") ?? "";
				const toReturn = exit();
				// trigger after running old() because "Property type" item only exists once menu opens
				plugin.app.workspace.trigger(
					"better-properties:file-property-menu",
					that,
					property
				);

				return toReturn;
			});
		},
	});

	plugin.register(removePatch);
};
