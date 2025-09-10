import { App } from "obsidian";
import { InputSuggest, Suggestion } from "..";

type Value = {
	type: string;
	name: string;
};
export class PropertyTypeSuggest extends InputSuggest<Value> {
	constructor(app: App, cmp: HTMLDivElement | HTMLInputElement) {
		super(app, cmp);
	}

	protected getSuggestions(query: string): Value[] {
		const { metadataTypeManager } = this.app;
		const arr = Object.values(metadataTypeManager.registeredTypeWidgets).map(
			(w) => ({
				type: w.type,
				name: w.name(),
			})
		);

		if (query === "") return arr;
		const lower = query.toLowerCase();
		return arr.filter(
			({ type, name }) =>
				(type.toLowerCase().includes(lower) ||
					name.toLowerCase().includes(lower)) &&
				this.setFilterCallback({ type, name })
		);
	}

	protected parseSuggestion({ name, type }: Value): Suggestion {
		return {
			title: name,
			note: type,
		};
	}
}
