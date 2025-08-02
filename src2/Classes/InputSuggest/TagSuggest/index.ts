import { App } from "obsidian";
import { InputSuggest, Suggestion } from "..";
import { getAllTags, iterateFileMetadata } from "~/lib/utils";

type Value = {
	tag: string;
	count: number;
};
export class TagSuggest extends InputSuggest<Value> {
	private shouldShowHashtags: boolean = true;
	constructor(app: App, cmp: HTMLDivElement | HTMLInputElement) {
		super(app, cmp);
	}

	showHashtags(b: boolean): this {
		this.shouldShowHashtags = b;
		return this;
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
		const allTagsMaybeHashtag = this.shouldShowHashtags
			? allTags
			: allTags.map(({ tag, count }) => ({ tag: tag.slice(1), count }));
		if (!query) return allTagsMaybeHashtag.filter(this.setFilterCallback);
		const lower = query.toLowerCase();
		return allTagsMaybeHashtag.filter(
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
