import { TFile, CachedMetadata, MetadataCache } from "obsidian";
import { Filter } from "@/MetaView/shared";
import { parseFilter } from "./parseFilter";

export const addMatchingItems = ({
	items,
	allFiles,
	metadataCache,
	filters,
	folder,
	excludedFolders,
}: {
	items: { file: TFile; metadata: CachedMetadata | null }[];
	allFiles: TFile[];
	metadataCache: MetadataCache;
	filters: Filter[];
	folder: string;
	excludedFolders: string[];
}) => {
	for (let i = 0; i < allFiles.length; i++) {
		const file = allFiles[i];
		const { path } = file;
		// don't add if not in specified folder
		if (folder && !path.startsWith(folder)) continue;
		// don't add if in an excluded folder
		if (
			excludedFolders.length &&
			excludedFolders.some((exFolder) => path.startsWith(exFolder))
		) {
			continue;
		}

		const metadata = metadataCache.getFileCache(file);
		const hasFailedFilter = filters.some(
			(filter) => !parseFilter(filter)(file, metadata)
		);
		// don't add if one of the filters returns false
		if (hasFailedFilter) continue;

		items.push({
			file,
			metadata,
		});
	}
};
