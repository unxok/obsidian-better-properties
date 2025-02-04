import { tryEval } from "@/libs/utils/pure";
import { Sorter, FileItem } from "@/MetaView/shared";

type ParseSorter = (sorter: Sorter) => (a: FileItem, b: FileItem) => number;

export const parseSorter: ParseSorter = (sorter) => {
	if (sorter.type === "custom") {
		const parsed = tryEval(sorter.func);
		if (parsed.success) {
			console.log("eval result: ", parsed.result);
			return parsed.result as () => number;
		}
		console.error(parsed.error);
		return () => 0;
	}

	// TODO parse for other types
	return () => 0;
};
