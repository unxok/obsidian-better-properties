import {
	DataviewQueryResult,
	DataviewLink,
	DataviewQueryResultHeaders,
} from "@/libs/types/dataview";
import {
	getDataviewLocalApi,
	getTableLine,
	isStatedWithoutId,
	ensureIdCol,
	getCols,
	getColsDetails,
	findPropertyKey,
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
} from "obsidian-typings";

const getPropertyUpdater = (plugin: Plugin) => {
	return async (filePath: string, key: string, value: unknown) => {
		const file = plugin.app.vault.getFileByPath(filePath);
		if (!file) return;
		await plugin.app.fileManager.processFrontMatter(
			file,
			(fm: Record<string, unknown>) => {
				const foundKey = findPropertyKey(key, fm) ?? key;
				updateNestedObject(fm, foundKey, value);
			}
		);
	};
};

type RenderHeaderProps = {
	header: DataviewQueryResultHeaders[number];
	headerIndex: number;
	tableIdColumnName: string;
	updateIdColIndex: (i: number) => void;
	hideIdCol: boolean;
	headerTypes: Map<string, PropertyWidget<unknown>>;
	headerLength: number;
	tHeadRow: HTMLElement;
	plugin: BetterProperties;
};
const renderHeader = ({
	header,
	headerIndex,
	updateIdColIndex,
	tableIdColumnName,
	hideIdCol,
	headerTypes,
	headerLength,
	tHeadRow,
	plugin,
}: RenderHeaderProps) => {
	const isIdCol = header === tableIdColumnName || header === "file.link";
	// todo may false positive if aliased
	if (isIdCol) {
		updateIdColIndex(headerIndex);
	}
	if (hideIdCol && headerIndex === headerLength - 1) return;
	const thWrapper = tHeadRow
		.createEl("th")
		.createDiv({ cls: "better-properties-dataview-table-th-wrapper" });

	const iconEl = thWrapper.createSpan();
	thWrapper.createSpan({ text: header });

	if (isIdCol) {
		setIcon(iconEl, "file");
	}

	const assignedType =
		plugin.app.metadataTypeManager.getAssignedType(header) ?? "text";
	const { registeredTypeWidgets } = plugin.app.metadataTypeManager;
	const assignedWidget =
		Object.values(registeredTypeWidgets).find((w) => w.type === assignedType) ??
		registeredTypeWidgets["text"];
	headerTypes.set(header, assignedWidget);

	const icon =
		plugin.getPropertySetting(header)?.general.customIcon ||
		assignedWidget.icon;
	setIcon(iconEl, icon);
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
	const { lineStart, text } = ctx.getSectionInfo(el) ?? {};
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
	const isWithoutId = isStatedWithoutId(preQuery);
	const { cols } = getCols(tableLine);
	const { query, hideIdCol } = ensureIdCol(preQuery, tableIdColumnName);
	// console.log("table: ", tableLine);
	// console.log("is without: ", isWithoutId);
	// console.log("width id col: ", query);
	// console.log("cols: ", cols);
	getColsDetails(cols);

	const queryResults = await dv.query(query);

	const updateProperty = getPropertyUpdater(plugin);

	const renderResults = (results: DataviewQueryResult) => {
		el.empty();

		if (!results.successful) {
			el.createEl("p")
				.createEl("pre")
				.createEl("code", { text: "Dataview: " + results.error });
			return;
		}

		const { headers, values, type } = results.value;

		const tableWrapper = createDiv({
			cls: "better-properties-dataview-table-wrapper markdown-source-view mod-cm6",
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
		const headerTypes = new Map<string, PropertyWidget<unknown>>();

		headers.forEach((header, headerIndex) =>
			renderHeader({
				header,
				headerIndex,
				tableIdColumnName,
				updateIdColIndex: (i) => (idColIndex = i),
				hideIdCol,
				headerTypes,
				headerLength: headers.length,
				tHeadRow,
				plugin,
			})
		);
		const tBody = table.createEl("tbody");

		const rowEls: unknown[][] = [];

		values.forEach((rowValues, rowIndex) => {
			const tr = tBody.createEl("tr");
			rowEls.push([]);

			rowValues.forEach((itemValue, itemIndex) => {
				if (hideIdCol && itemIndex === rowValues.length - 1) return;
				const td = tr.createEl("td");
				if (itemIndex === idColIndex) {
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

				const dotKeysArr = headers[itemIndex].split(".");
				const key = dotKeysArr[dotKeysArr.length - 1];

				const link = values[rowIndex][idColIndex];
				const filePath = link?.hasOwnProperty("path")
					? (link as DataviewLink).path
					: null;

				const widget =
					headerTypes.get(headers[itemIndex]) ??
					plugin.app.metadataTypeManager.registeredTypeWidgets["text"];

				const container = td
					.createDiv({ cls: "metadata-property" })
					.createDiv({ cls: "metadata-property-value" });
				widget.render(
					container,
					{
						key: key,
						type: widget.type,
						value: itemValue,
						dotKey: headers[itemIndex],
					} as PropertyEntryData<unknown>,
					{
						app: plugin.app,
						blur: () => {},
						key: key,
						metadataEditor: {
							register: (cb) => mdrc.register(cb),
						} as MetadataEditor,
						onChange: (value) =>
							filePath && updateProperty(filePath, headers[itemIndex], value),
						sourcePath: ctx.sourcePath,
					}
				);
			});
		});

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
