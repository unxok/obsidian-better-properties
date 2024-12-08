import {
	DataviewAPI,
	DataviewLink,
	DataviewPlugin,
} from "@/libs/types/dataview";
import { DateTime } from "luxon";
import { Component, Plugin } from "obsidian";
import { MetadataTypeManager } from "obsidian-typings";
import { findKeyInsensitive } from "../pure";

export const getDataviewLocalApi = (
	plugin: Plugin,
	sourcePath: string,
	component: Component,
	el: HTMLElement
) => {
	const dvPlugin = plugin.app.plugins.getPlugin(
		"dataview"
	) as DataviewPlugin | null;
	if (!dvPlugin) return null;
	return dvPlugin.localApi(sourcePath, component, el);
};

export const normalizeValue = (value: unknown) => {
	console.log(value);
	if (!value) return value;
	const t = typeof value;
	if (t !== "object") return value;
	if (DateTime.isDateTime(value)) {
		console.log("normalizing date/datetime");
		if (value.second === 0 && value.minute === 0 && value.hour === 0) {
			console.log("no time");
			const r = value.toFormat("yyyy-MM-dd");
			console.log(r);
			return r;
		}
		console.log("has time");
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

export const checkIsStatedWithoutId = (query: string) => {
	const reg = /(\n*\s*(?:without id))(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/im;
	return reg.test(query);
};

export const ensureIdCol: (
	query: string,
	tableIdColumnName: string
) => { query: string; hideIdCol: boolean } = (query, tableIdColumnName) => {
	// Does not contain "WITHOUT ID", so id col is there by default
	if (!checkIsStatedWithoutId(query)) return { query, hideIdCol: false };

	const { tableLine, rest } = getTableLine(query);
	const reg = /(\n*\s*(?:file\.link))(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/im;
	const hasIdCol = reg.test(tableLine);
	if (hasIdCol) return { query: tableLine + rest, hideIdCol: false };
	const q = tableLine + ', file.link AS "' + tableIdColumnName + '" ' + rest;
	return { query: q, hideIdCol: true };
};

export const getCols = (tableLine: string) => {
	const [_, tableKeyword, colsString] = tableLine.split(
		/(\n*\s*(?:TABLE\s?W?I?T?H?O?U?T?\s?I?D?\s))(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/im
	);
	const cols = colsString.split(/,\s?(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gm);
	return { tableKeyword, cols };
};

export const getColsDetails = (cols: string[], mtm: MetadataTypeManager) => {
	return cols.map((c) => {
		// split on 'AS' where it is not escaped within double quotes
		const [prop = ""] = c.split(
			/\sAS\s?(?!(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$))/gim
		);

		// property is within some function
		// ex: striptime(date-property)
		const isCalculated = /.+\(.*\)/gm.test(prop);

		// row format is required for properties named the same as a reserved DV keyword
		// ex: table, group, from, etc.
		const propFromRowFormat =
			prop.startsWith('row["') && prop.endsWith('"]')
				? prop.slice(5, -2)
				: prop;

		const propMatchedExisting = findExistingProperty(
			propFromRowFormat,
			mtm.properties
		);

		const assignedType = mtm.getAssignedType(propMatchedExisting) ?? "text";
		const assignedTypeWidget =
			Object.values(mtm.registeredTypeWidgets).find(
				(w) => w.type === assignedType
			) ?? null;

		return {
			property: propMatchedExisting,
			// alias: aliasNoQuotes,
			isCalculated,
			assignedTypeWidget,
		};
	});
};

export const findPropertyKey = (key: string, obj: Record<string, unknown>) => {
	const lowerWithSpaces = key.toLowerCase().replaceAll("-", " ");
	const found = Object.keys(obj).find(
		(k) => k.toLowerCase() === lowerWithSpaces
	);
	return found ?? null;
};

const findExistingProperty = (key: string, obj: Record<string, unknown>) => {
	const lower = key.toLowerCase();
	const withSpaces = lower.replaceAll("-", " ");
	const keys = Object.keys(obj);
	const found = keys.find((k) => {
		const kLower = k.toLowerCase();
		return kLower === lower || kLower === withSpaces;
	});
	return found ?? key;
};
