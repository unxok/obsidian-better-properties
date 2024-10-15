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
				const { target } = e;
				const isHTML = target instanceof HTMLElement;
				const isSVG = target instanceof SVGElement;
				if (!isHTML && !isSVG) return exit();

				const isExact =
					target instanceof HTMLElement &&
					target.tagName.toLowerCase() === "span" &&
					target.classList.contains("metadata-property-icon");

				const trueTarget = isExact
					? target
					: target.closest<HTMLElement>(
							"span.metadata-property-icon"
					  );

				if (!trueTarget) return exit();

				const container = trueTarget.closest(
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
