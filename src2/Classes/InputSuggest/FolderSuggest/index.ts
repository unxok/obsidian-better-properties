import { App, SearchComponent, TextComponent, TFolder } from "obsidian";
import { compareFunc } from "@/libs/utils/obsidian";
import { InputSuggest, Suggestion } from "..";

export class FolderSuggest extends InputSuggest<TFolder> {
	constructor(app: App, component: SearchComponent | TextComponent) {
		super(app, component);
	}

	protected getSuggestions(query: string): TFolder[] | Promise<TFolder[]> {
		const { app } = this;
		const allFolders = app.vault
			.getAllFolders(true)
			.toSorted((a, b) => compareFunc(a.path, b.path));
		if (!query) return allFolders;
		const lower = query.toLowerCase();
		return allFolders.filter(({ path }) => path.toLowerCase().includes(lower));
	}

	protected parseSuggestion({ path, name }: TFolder): Suggestion {
		return {
			title: name,
			note: path,
		};
	}

	selectSuggestion({ path }: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.component.setValue(path);
		this.component.onChanged();
	}
}
