import { monkeyAroundKey } from "@/libs/constants";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import { Modal } from "obsidian";

type GithubResponse = {
	forks: number;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
};

type CommunityPluginItem = {
	repo: string;
	el: HTMLElement;
};

interface CommunityPluginModal extends Modal {
	items: Record<string, CommunityPluginItem>;
	showItem(item: CommunityPluginItem): void;
}

let isPatched = false;

const getRepo = async () => {
	const res = await requestUrl(
		"https://api.github.com/repos/liamcain/obsidian-calendar-plugin"
	);
	try {
		const json = await res.json;
		console.log(json);
		return json;
	} catch (e) {
		console.error(e);
	}
};

export const patchModal = (plugin: BetterProperties) => {
	const uninstaller = around(Modal.prototype, {
		open(old) {
			return dedupe(monkeyAroundKey, old, function () {
				// @ts-ignore
				const that = this as Modal;

				const exit = () => old.call(that);

				if (
					isPatched ||
					!that.modalEl.classList.contains("mod-community-plugin")
				)
					return exit();
				isPatched = true;

				console.log("modal opened: ", that);

				patchCommunityPluginsModal(
					plugin,
					Object.getPrototypeOf(that) as CommunityPluginModal
				);

				exit();
			});
		},
	});

	plugin.register(uninstaller);
};

const patchCommunityPluginsModal = (
	plugin: BetterProperties,
	proto: CommunityPluginModal
) => {
	const uninstaller = around(proto, {
		showItem(old) {
			return dedupe(monkeyAroundKey, old, function (item) {
				// @ts-ignore
				const that = this as CommunityPluginModal;

				const exit = () => old.call(that, item);
			});
		},
	});

	plugin.register(uninstaller);
};
