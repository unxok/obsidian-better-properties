import { App, TFile, TFolder } from "obsidian";
import { InputSuggest, Suggestion } from "..";
import { compareFunc } from "~/lib/utils";

export class FolderSuggest extends InputSuggest<TFolder> {
	constructor(
		app: App,
		component: HTMLDivElement | HTMLInputElement,
		public options?: {
			showFileCountAux: boolean;
		}
	) {
		super(app, component);
	}

	protected getSuggestions(query: string): TFolder[] | Promise<TFolder[]> {
		const { app } = this;
		const allFolders = app.vault
			.getAllFolders(true)
			.toSorted((a, b) => compareFunc(a.path, b.path));
		if (!query) return allFolders.filter(this.setFilterCallback);
		const lower = query.toLowerCase();
		return allFolders.filter(
			(v) => v.path.toLowerCase().includes(lower) && this.setFilterCallback(v)
		);
	}

	protected parseSuggestion({ path, name, children }: TFolder): Suggestion {
		return {
			title: name,
			note: path,
			aux: this.options?.showFileCountAux
				? children.filter((t) => t instanceof TFile).length.toString()
				: undefined,
		};
	}
}
