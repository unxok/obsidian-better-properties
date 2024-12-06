import { DataviewLink } from "@/libs/types/dataview";
import { DateTime } from "luxon";

export const normalizeValue = (value: unknown) => {
	if (!value) return value;
	const t = typeof value;
	if (t !== "object") return value;
	if (DateTime.isDateTime(value)) {
		if (value.second === 0 && value.minute === 0 && value.hour === 0) {
			return value.toFormat("yyyy-MM-dd");
		}
		return value.toFormat("yyyy-MM-dd'T'hh:mm:ss");
	}
	if (Array.isArray(value)) {
		if (!value.hasOwnProperty("array")) return value;
		// is a DataArray from Dataview
		return (value as unknown[] & { array: () => unknown[] }).array();
	}

	if (!(value as Record<string, unknown>).markdown) return value;
	const possibleLink = value as DataviewLink;
	// is actually an object with "markdown" property
	if (typeof possibleLink.markdown !== "function") return possibleLink;
	return possibleLink.markdown();
};

export const getTableLine = (query: string) => {
	const reg =
		/(\n*\s*(?:from|where|sort|limit))(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/im;
	const [line, ...rest] = query.split(reg);

	return {
		tableLine: line,
		rest: rest.join(""),
	};
};

export const isStatedWithoutId = (query: string) => {
	const reg = /(\n*\s*(?:without id))(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/im;
	return reg.test(query);
};

export const ensureIdCol: (
	query: string,
	tableIdColumnName: string
) => { query: string; hideIdCol: boolean } = (query, tableIdColumnName) => {
	// Does not contain "WITHOUT ID", so id col is there by default
	if (!isStatedWithoutId(query)) return { query, hideIdCol: false };

	const { tableLine, rest } = getTableLine(query);
	const reg = /(\n*\s*(?:file\.link))(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/im;
	const hasIdCol = reg.test(tableLine);
	if (hasIdCol) return { query: tableLine + rest, hideIdCol: false };
	const q = tableLine + ', file.link AS "' + tableIdColumnName + '" ' + rest;
	return { query: q, hideIdCol: true };
};
