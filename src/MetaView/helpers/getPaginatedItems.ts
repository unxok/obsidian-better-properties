import { clampNumber } from "@/libs/utils/pure";
import { FileItem } from "@/MetaView/shared";

export const getPaginatedItems = (
	items: FileItem[],
	pageNumber: number,
	pageSize: number
) => {
	if (pageSize <= 0) return items;
	const totalPages = pageSize <= 0 ? 1 : Math.ceil(items.length / pageSize);
	const truePageSize = Math.floor(pageSize);
	// unneccessary +/- 1's are for sake of readability
	const pageIndex = clampNumber(pageNumber, 1, totalPages) - 1;
	const startingResultIndex = pageIndex * truePageSize;
	const endingResultIndex = (pageIndex + 1) * truePageSize - 1;
	return items.slice(startingResultIndex, endingResultIndex + 1);
};
