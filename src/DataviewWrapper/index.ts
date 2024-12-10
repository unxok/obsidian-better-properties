import {
	DataviewQueryResult,
	DataviewLink,
	DataviewQueryResultHeaders,
} from "@/libs/types/dataview";
import {
	getDataviewLocalApi,
	getTableLine,
	checkIsStatedWithoutId,
	ensureIdCol,
	getCols,
	getColsDetails,
	findPropertyKey,
	normalizeValue,
} from "@/libs/utils/dataview";
import { findKeyInsensitive, updateNestedObject } from "@/libs/utils/pure";
import BetterProperties from "@/main";
import {
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	setIcon,
	MarkdownRenderer,
	Plugin,
} from "obsidian";
import {
	PropertyWidget,
	PropertyEntryData,
	MetadataEditor,
	MetadataTypeManager,
	PropertyRenderContext,
} from "obsidian-typings";

const getPropertyUpdater = (plugin: Plugin) => {
	return async (filePath: string, key: string, value: unknown) => {
		const file = plugin.app.vault.getFileByPath(filePath);
		if (!file) return;
		await plugin.app.fileManager.processFrontMatter(
			file,
			(fm: Record<string, unknown>) => {
				// const foundKey = findPropertyKey(key, fm) ?? key;
				updateNestedObject(fm, key, value);
			}
		);
	};
};

// const getAssignedType = (mtm: MetadataTypeManager, property: string) => {
// 	if (property === "") return "text";

// 	const found = findPropertyKey(property, mtm.types);
// 	if (!found) return "text";
// 	return mtm.types[found].type;
// };

type RenderHeaderProps = {
	property: string;
	alias: string | undefined;
	assignedTypeWidget: PropertyWidget<unknown> | null;
	isCalculated: boolean;
	headerIndex: number;
	tableIdColumnName: string;
	updateIdColIndex: (i: number) => void;
	hideIdCol: boolean;
	headerLength: number;
	tHeadRow: HTMLElement;
	plugin: BetterProperties;
};
const renderHeader = ({
	property,
	alias,
	assignedTypeWidget,
	isCalculated,
	headerIndex,
	updateIdColIndex,
	tableIdColumnName,
	hideIdCol,
	headerLength,
	tHeadRow,
	plugin,
}: RenderHeaderProps) => {
	const isIdCol = property === tableIdColumnName || property === "file.link";
	// todo may false positive if aliased
	if (isIdCol) {
		updateIdColIndex(headerIndex);
	}
	if (hideIdCol && headerIndex === headerLength - 1) return;
	const thWrapper = tHeadRow
		.createEl("th")
		.createDiv({ cls: "better-properties-dataview-table-th-wrapper" });

	const iconEl = thWrapper.createSpan();
	thWrapper.createSpan({ text: alias ?? property });

	if (isIdCol) {
		setIcon(iconEl, "file");
	}

	const { registeredTypeWidgets } = plugin.app.metadataTypeManager;

	const icon = isCalculated
		? "variable"
		: plugin.getPropertySetting(property)?.general.customIcon ||
		  assignedTypeWidget?.icon;
	setIcon(iconEl, icon ?? "file-question");
};

type RenderCellProps = {};
const renderCell = (props: RenderCellProps) => {};

export const processDataviewWrapperBlock = async (
	plugin: BetterProperties,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	const mdrc = new MarkdownRenderChild(el);
	ctx.addChild(mdrc);
	const preQuery = source;
	const {
		lineStart = NaN,
		lineEnd = NaN,
		text = "",
	} = ctx.getSectionInfo(el) ?? {};
	if (!lineStart) {
		el.createDiv({ text: "error: no lineStart" });
		return;
	}
	const id = text?.split("\n")[lineStart].split(" ")[1];

	const dv = getDataviewLocalApi(plugin, ctx.sourcePath, mdrc, el);

	if (!dv) {
		el.createDiv({ text: "error: No DataviewAPI found" });
		return;
	}

	const { tableIdColumnName } = dv.settings;

	const { tableLine } = getTableLine(preQuery);
	const isWithoutId = checkIsStatedWithoutId(preQuery);
	const { cols } = getCols(tableLine);
	const { query, hideIdCol } = ensureIdCol(preQuery, tableIdColumnName);
	// console.log("table: ", tableLine);
	// console.log("is without: ", isWithoutId);
	// console.log("width id col: ", query);
	// console.log("cols: ", cols);
	const colsDetails = getColsDetails(cols, plugin.app.metadataTypeManager);
	// console.log("cols details: ", JSON.parse(JSON.stringify(colsDetails)));

	const queryResults = await dv.query(query);

	const updateProperty = getPropertyUpdater(plugin);

	const renderResults = (results: DataviewQueryResult) => {
		if (!results.successful) {
			el.empty();
			el.createEl("p")
				.createEl("pre")
				.createEl("code", { text: "Dataview: " + results.error });
			return;
		}

		const { headers, values, type } = results.value;

		const tableWrapper = createDiv({
			cls: "better-properties-dataview-table-wrapper markdown-source-view mod-cm6",
		});

		// tableWrapper
		// 	.createEl("button", { text: "counter" })
		// 	.addEventListener("click", () => {
		// 		const editor = plugin.app.workspace.activeEditor?.editor;
		// 		if (!editor) return;
		// 		const fullBlockSource = text
		// 			.split("\n")
		// 			.slice(lineStart, lineEnd)
		// 			.join("\n");
		// 		editor.replaceRange(
		// 			fullBlockSource + "\nAND true\n```",
		// 			{ ch: 0, line: lineStart },
		// 			{ ch: NaN, line: lineEnd }
		// 		);
		// 	});

		tableWrapper
			.createEl("button", { text: "counter" })
			.addEventListener("click", () => {
				const editor = plugin.app.workspace.activeEditor?.editor;
				if (!editor) return;
				const fullBlockSource = text
					.split("\n")
					.slice(lineStart, lineEnd)
					.join("\n");

				const scrollTop = editor.getScrollInfo().top;
				editor.replaceRange(
					fullBlockSource + "\nAND true\n```",
					{ ch: 0, line: lineStart },
					{ ch: NaN, line: lineEnd }
				);
				setTimeout(() => {
					editor.scrollTo(null, scrollTop);
				}, 0);
			});

		const table = tableWrapper.createEl("table", {
			cls: "table-editor better-properties-dataview-table",
			attr: {
				"tab-index": "-1",
			},
		});
		const tHead = table.createEl("thead");
		const tHeadRow = tHead.createEl("tr");

		let idColIndex = -1;

		headers.forEach((header, headerIndex) => {
			const { property, assignedTypeWidget, isCalculated } = colsDetails[
				isWithoutId ? headerIndex : headerIndex - 1
			] ?? { property: header, assignedTypeWidget: null, isCalculated: false };
			renderHeader({
				property,
				alias: header,
				assignedTypeWidget,
				isCalculated,
				headerIndex,
				tableIdColumnName,
				updateIdColIndex: (i) => (idColIndex = i),
				hideIdCol,
				headerLength: headers.length,
				tHeadRow,
				plugin,
			});
		});
		const tBody = table.createEl("tbody");

		const rowEls: unknown[][] = [];

		values.forEach((rowValues, rowIndex) => {
			const tr = tBody.createEl("tr");
			rowEls.push([]);

			rowValues.forEach((itemValue, itemIndex) => {
				if (hideIdCol && itemIndex === rowValues.length - 1) return;
				const td = tr.createEl("td");

				const matchedHeader = headers[itemIndex];
				const { property, assignedTypeWidget, isCalculated } = colsDetails[
					isWithoutId ? itemIndex : itemIndex - 1
				] ?? {
					property: matchedHeader,
					assignedTypeWidget: null,
					isCalculated: false,
				};

				// if is ID col (just a file link) *or* is a calculated property *or* has no found type widget
				if (itemIndex === idColIndex || isCalculated || !assignedTypeWidget) {
					MarkdownRenderer.render(
						plugin.app,
						itemValue?.toString() ?? "",
						td.createDiv({
							cls: "metadata-input-longtext",
						}),
						ctx.sourcePath,
						mdrc
					);
					return;
				}

				const dotKeysArr = property.split(".");
				const key = dotKeysArr[dotKeysArr.length - 1];

				const link = values[rowIndex][idColIndex];
				const filePath = link?.hasOwnProperty("path")
					? (link as DataviewLink).path
					: null;

				const container = td
					.createDiv({ cls: "metadata-property" })
					.createDiv({ cls: "metadata-property-value" });
				assignedTypeWidget.render(
					container,
					{
						key: key,
						type: assignedTypeWidget.type,
						value: normalizeValue(itemValue),
						dotKey: headers[itemIndex],
					} as PropertyEntryData<unknown>,
					{
						app: plugin.app,
						blur: () => {},
						key: key,
						dotKey: property,
						metadataEditor: {
							register: (cb) => mdrc.register(cb),
						} as MetadataEditor,
						onChange: (value) =>
							filePath && updateProperty(filePath, headers[itemIndex], value),
						sourcePath: ctx.sourcePath,
					} as PropertyRenderContext
				);
			});
		});

		el.empty();
		el.appendChild(tableWrapper);
		return tableWrapper;
	};

	let tableWrapper = renderResults(queryResults);

	const onMetaChange = async () => {
		const results = await dv.query(query, ctx.sourcePath);
		const scrollX = tableWrapper?.scrollLeft ?? 0;
		const newWrapper = renderResults(results);
		newWrapper?.scroll({ left: scrollX });
		tableWrapper = newWrapper;
	};

	plugin.app.metadataCache.on(
		"dataview:metadata-change" as "changed",
		onMetaChange
	);

	mdrc.register(() =>
		plugin.app.metadataCache.off(
			"dataview:metadata-change" as "changed",
			onMetaChange
		)
	);
};
