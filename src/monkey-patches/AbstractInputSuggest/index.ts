import { monkeyAroundKey } from "@/libs/constants";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import { Menu, AbstractInputSuggest } from "obsidian";

export const patchAbstractInputSuggest = (plugin: BetterProperties) => {
	const removePatch = around(AbstractInputSuggest.prototype, {
		showSuggestions(old) {
			return dedupe(monkeyAroundKey, old, function (e: unknown[]) {
				// @ts-ignore Doesn't look like there's a way to get this typed correctly
				const that = this as AbstractInputSuggest<unknown>;
				const exit = () => {
					return old.call(that, e);
				};

				that.limit = 200;

				return exit();
			});
		},
	});

	plugin.register(removePatch);
};
