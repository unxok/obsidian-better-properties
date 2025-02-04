import { tryEval } from "@/libs/utils/pure";
import { Filter } from "@/MetaView/shared";
import { TFile, CachedMetadata } from "obsidian";

type ParseFilter = (
	filter: Filter
) => (file: TFile, metadata: CachedMetadata | null) => boolean;

export const parseFilter: ParseFilter = (filter) => {
	if (filter.type === "custom") {
		const parsed = tryEval(filter.func);
		if (parsed.success) {
			return parsed.result as () => boolean;
		}
		console.error(parsed.error);
		return () => true;
	}

	// TODO parse for other types
	return () => true;
};
