import { App } from "obsidian";
import { InputSuggest, Suggestion } from "..";
import { getAllTags, iterateFileMetadata } from "~/lib/utils";

type Value = {
	tag: string;
	count: number;
};
export class TagSuggest extends InputSuggest<Value> {
	constructor(app: App, cmp: HTMLDivElement | HTMLInputElement) {
		super(app, cmp);
	}

	protected getSuggestions(query: string): Value[] {
		const { vault, metadataCache } = this.app;
		const record: Record<string, number> = {};
		iterateFileMetadata({
			vault,
			metadataCache,
			callback: ({ metadata }) => {
				if (!metadata) return;
				const tags = getAllTags(metadata, false);
				tags?.forEach((t) => {
					t in record ? record[t]++ : (record[t] = 1);
				});
			},
		});
		const allTags = Object.entries(record).map(
			([tag, count]) => ({ tag, count }),
			[] as Value[]
		);

		if (!query) return allTags.filter(this.setFilterCallback);
		const lower = query.toLowerCase();
		return allTags.filter(
			(v) => v.tag.toLowerCase().startsWith(lower) && this.setFilterCallback(v)
		);
	}

	protected parseSuggestion({ tag, count }: Value): Suggestion {
		return {
			title: tag,
			aux: count.toString(),
		};
	}
}
