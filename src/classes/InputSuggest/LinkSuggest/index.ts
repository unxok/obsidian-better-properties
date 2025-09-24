import { App, setIcon } from "obsidian";
import { InputSuggest, Suggestion } from "..";
import { LinkSuggestion } from "obsidian-typings";
import { Icon } from "~/lib/types/icons";

export class LinkSuggest extends InputSuggest<LinkSuggestion> {
	constructor(
		app: App,
		component: HTMLDivElement | HTMLInputElement,
		public respectUserIgnored: boolean = true
	) {
		super(app, component);
	}

	protected getSuggestions(
		query: string
	): LinkSuggestion[] | Promise<LinkSuggestion[]> {
		const { metadataCache } = this.app;
		const lowerQuery = query.toLowerCase();
		return metadataCache.getLinkSuggestions().filter((s) => {
			const isValidExtension = s.file
				? s.file?.extension.toLowerCase() === "md"
				: true;
			const isIgnored = metadataCache.isUserIgnored(s.path);
			const isMatch =
				!query ||
				s.alias?.toLowerCase()?.includes(lowerQuery) ||
				s.path.toLowerCase().includes(lowerQuery);
			return (
				isValidExtension && !isIgnored && isMatch && this.setFilterCallback(s)
			);
		});
	}

	protected parseSuggestion({ path, file, alias }: LinkSuggestion): Suggestion {
		return {
			title: alias ?? file?.basename ?? path,
			note: alias
				? path
				: file
				? path.slice(0, -1 * file.basename.length)
				: undefined,
			aux: alias ? " " : undefined,
		};
	}

	override renderSuggestion(value: LinkSuggestion, el: HTMLElement): void {
		super.renderSuggestion(value, el);
		if (!value.alias) return;
		const auxFlairEl: HTMLElement | null = el.querySelector(
			".suggestion-aux > .suggestion-flair"
		);
		if (!auxFlairEl) return;
		setIcon(auxFlairEl, "lucide-forward" satisfies Icon);
	}
}
