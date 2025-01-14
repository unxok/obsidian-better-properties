import { monkeyAroundKey } from "@/libs/constants";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import { Modal, moment, setIcon } from "obsidian";

/*
TODO
Make into it's own plugin
Something like: More Plugin Stats
*/

type GithubResponse = {
	forks: number;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	contributors_url: string;
	pushed_at: string;
	created_at: string;
};

type CommunityPluginItem = {
	repo: string;
	el: HTMLElement;
};

interface CommunityPluginModal extends Modal {
	items: Record<string, CommunityPluginItem>;
	detailsEl: HTMLElement;
	showItem(item: CommunityPluginItem): void;
}

let isPatched = false;

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

				appendInfo(that, item);

				return exit();
			});
		},
	});

	plugin.register(uninstaller);
};

const appendInfo = async (
	modal: CommunityPluginModal,
	item: CommunityPluginItem
) => {
	const info = await getRepo(item.repo);
	if (!info) {
		// do something else
		return;
	}
	const {
		stargazers_count,
		forks_count,
		open_issues_count,
		contributors_url,
		pushed_at,
		created_at,
	} = info;
	console.log("item: ", item);
	console.log("got info: ", info);
	const contributors = await getContributors(contributors_url);
	console.log("contributors: ", contributors);
	const container = createDiv({ cls: "more-plugin-stats-container" });
	const title = container.createDiv({
		cls: "more-plugin-stats-container-title",
		text: "Github stats",
	});
	const itemContainer = container.createDiv({
		cls: "more-plugin-stats-item-container",
	});
	const infos: ItemInfo[] = [
		{
			icon: "star",
			tooltip: "Stars",
			value: stargazers_count,
		},
		{
			icon: "git-fork",
			tooltip: "Forks",
			value: forks_count,
		},
		{
			icon: "circle-dot",
			tooltip: "Open issues",
			value: open_issues_count,
		},
		{
			icon: "users",
			tooltip: "Contributors",
			value: contributors,
		},
	];
	infos.forEach((i) => createInfoItem(itemContainer, i));
	const descriptionEl = modal.detailsEl.querySelector(
		".community-modal-info-desc"
	);
	if (!descriptionEl) {
		// do something else
		return;
	}

	const infoEls: HTMLElement[] = [
		createRepoInfo("Last push: ", (el) =>
			el.createEl("a", {
				text: moment(pushed_at).fromNow(),
				href: "https:/github.com/" + item.repo + "/commits",
				attr: {
					"target": "_blank",
					"aria-label": "View latest commits",
				},
			})
		),
		createRepoInfo("Repository created: " + moment(created_at).fromNow()),
		createRepoInfo("Open issues: " + open_issues_count.toLocaleString()),
		createRepoInfo("Contributors: " + contributors.toLocaleString()),
		createRepoInfo("Stars: " + stargazers_count.toLocaleString()),
		createRepoInfo("Forks: " + forks_count.toLocaleString()),
	];

	infoEls.forEach((el) =>
		descriptionEl.insertAdjacentElement("beforebegin", el)
	);
};

type ItemInfo = {
	tooltip: string;
	icon: string;
	value: string | number;
};

const createRepoInfo = (text: string, callback?: (el: HTMLElement) => void) => {
	const el = createDiv({
		cls: "community-modal-info-repo",
		text: text,
	});
	if (!callback) return el;
	callback(el);
	return el;
};

const createInfoItem = (
	container: HTMLElement,
	{ tooltip, icon, value }: ItemInfo
) => {
	const sub = container.createDiv({
		cls: "more-plugin-stats-item",
		attr: { "aria-label": tooltip },
	});
	setIcon(sub.createSpan({ cls: "more-plugin-stats-item-icon" }), icon);
	sub.createSpan({
		cls: "more-plugin-stats-item-value",
		text: value.toString(),
	});
};

const getRepo = async (repoUrl: string) => {
	const res = await requestUrl("https://api.github.com/repos/" + repoUrl);
	try {
		const json = await res.json;
		return json as GithubResponse;
	} catch (e) {
		console.error(e);
	}
};

type ContributorsResponse = {
	login: string;
}[];

const getContributors = async (contributorsUrl: string) => {
	const res = await requestUrl(contributorsUrl);
	try {
		const json = (await res.json) as ContributorsResponse;
		return json.length;
	} catch (e) {
		console.error(e);
		return "?";
	}
};
