import {
	App,
	Component,
	ItemView,
	MarkdownRenderer,
	WorkspaceLeaf,
} from "obsidian";
import { latest } from "./latest";
import BetterProperties from "~/main";

const BP_CHANGELOG_VIEW_TYPE = "better-properties-changelog-view";

const getVersion = (app: App) =>
	app.plugins.manifests["better-properties"]?.version;

class ChangelogView extends ItemView {
	component: Component;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.component = new Component();
		this.register(() => this.component.unload());
	}

	getViewType(): string {
		return BP_CHANGELOG_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "What's new - Better Properties";
	}

	protected async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		const containerEl = contentEl.createDiv({
			cls: "markdown-reading-view markdown-preview-view markdown-rendered",
		});
		const changelogContent = latest.markdown.replace(
			"# Changelog",
			`# Changelog ${getVersion(this.app)}` +
				"\nExtracted from [changelog.md on github](https://github.com/unxok/obsidian-better-properties/changelog.md)\n"
		);
		MarkdownRenderer.render(
			this.app,
			changelogContent,
			containerEl,
			"",
			this.component
		);
	}

	protected async onClose(): Promise<void> {
		this.component.unload();
	}
}

export const handleChangelogView = async (
	plugin: BetterProperties
): Promise<void> => {
	plugin.registerView(
		BP_CHANGELOG_VIEW_TYPE,
		(leaf) => new ChangelogView(leaf)
	);

	const version = getVersion(plugin.app);
	if (plugin.settings.lastChangelogViewed === version) {
		return;
	}

	await showChangelogView(plugin);
	await plugin.updateSettings((s) => ({ ...s, lastChangelogViewed: version }));
};

export const showChangelogView = async (
	plugin: BetterProperties
): Promise<void> => {
	const { workspace } = plugin.app;
	workspace.getLeavesOfType(BP_CHANGELOG_VIEW_TYPE).forEach((l) => l.detach());
	const leaf = workspace.getLeaf("tab");
	await leaf.setViewState({ type: BP_CHANGELOG_VIEW_TYPE, active: true });
};
