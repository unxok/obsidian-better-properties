import { tryParseYaml } from "@/libs/utils/obsidian";
import { BlockConfig, FileDataField } from "@/MetaView/shared";

type ParseBlockConfig = (source: string) => BlockConfig;

export const parseBlockConfig: ParseBlockConfig = (source) => {
	const defaultConfig: BlockConfig = {
		fields: [],
		filters: [],
		folder: "",
		excludedFolders: [],
		sorter: {
			asc: true,
			type: "fileData",
			value: "file-name" as FileDataField["value"],
			label: "By file name (A to Z)",
		},
		pageNumber: 1,
		pageSize: 10,
	};

	const parsed = tryParseYaml(source);
	if (!parsed.success) {
		console.log("Failed to parse YAML block config... reverting to default");
		return { ...defaultConfig };
	}
	return { ...defaultConfig, ...(parsed.data as BlockConfig) };
};
