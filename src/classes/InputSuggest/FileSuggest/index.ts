import { App, TFile } from "obsidian";
import { compareFunc } from "~/lib/utils";
import { InputSuggest, Suggestion } from "..";

export class FileSuggest extends InputSuggest<TFile> {
	constructor(
		app: App,
		component: HTMLDivElement | HTMLInputElement,
		public respectUserIgnored: boolean = true
	) {
		super(app, component);
	}

	protected getSuggestions(query: string): TFile[] | Promise<TFile[]> {
		const { app } = this;
		const allFiles = app.vault
			.getFiles()
			.toSorted((a, b) => compareFunc(a.path, b.path));
		const notIgnored = this.respectUserIgnored
			? allFiles.filter((f) => !this.app.metadataCache.isUserIgnored(f.path))
			: allFiles;
		if (!query) return notIgnored.filter(this.setFilterCallback);
		const lower = query.toLowerCase();
		return notIgnored.filter(
			(v) => v.path.toLowerCase().includes(lower) && this.setFilterCallback(v)
		);
	}

	protected parseSuggestion({ path, name }: TFile): Suggestion {
		return {
			title: name,
			note: path,
		};
	}
}
