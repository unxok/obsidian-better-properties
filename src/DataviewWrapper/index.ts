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
	Editor,
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
	config: BlockConfig;
	updateConfig: UpdateConfigFunction;
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
	config,
	updateConfig,
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
	const th = tHeadRow.createEl("th", { cls: "better-properties-dataview-th" });

	const setThWidth = (w: number) => {
		th.style.setProperty("min-width", w + "px");
		th.style.setProperty("max-width", w + "px");
	};

	const configWidth = config.colWidths[headerIndex];
	if (configWidth) {
		setThWidth(configWidth);
	}

	const resizeHandle = th.createDiv({
		cls: "better-properties-dataview-th-resize-handle",
	});

	let lastMousePos = 0;
	let width = 0;

	const onMouseMove = (e: MouseEvent) => {
		const diff = e.clientX - lastMousePos;
		const newWidth = width + diff;
		setThWidth(newWidth);
		width = newWidth;
		lastMousePos = e.clientX;
	};

	const onMouseUp = async (e: MouseEvent) => {
		console.log("up");
		e.preventDefault();
		e.stopImmediatePropagation();
		e.stopPropagation();
		await updateConfig((c) => ({
			...c,
			colWidths: {
				...c.colWidths,
				[headerIndex]: width,
			},
		}));
		document.removeEventListener("mousemove", onMouseMove);
		document.removeEventListener("mouseup", onMouseUp);
	};

	// If within a calloout, will prevent it from going into "callout edit mode"
	resizeHandle.addEventListener("click", (e) => e.preventDefault());

	resizeHandle.addEventListener("mousedown", (e) => {
		width = th.getBoundingClientRect().width;
		lastMousePos = e.clientX;

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	});

	resizeHandle.addEventListener("dblclick", async () => {
		await updateConfig((c) => {
			delete c.colWidths[headerIndex];
			return c;
		});
		th.style.removeProperty("min-width");
		th.style.removeProperty("max-width");
	});

	const thWrapper = th.createDiv({
		cls: "better-properties-dataview-table-th-container",
	});

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

	const foundConfigStr =
		source.split("\n").find((ln) => ln.startsWith("//BP ")) ?? "";
	const config = getConfigFromStr(foundConfigStr.slice(5));
	console.log("config: ", config);

	const updateConfig: UpdateConfigFunction = async (cb) => {
		const newConfig = cb({ ...config });
		const info = ctx.getSectionInfo(el);
		const { editor } = plugin.app.workspace.activeEditor ?? {};
		if (!info || !editor) return;
		const { lineStart, lineEnd } = info;
		await setConfig({
			source,
			sourcePath: ctx.sourcePath,
			config: newConfig,
			sourceLineStart: lineStart + 1,
			sourceLineEnd: lineEnd - 1,
			plugin,
		});
	};

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

	el.createDiv({ cls: "is-loading" });
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
				config,
				updateConfig,
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
		// if (JSON.stringify(results?.value) === JSON.stringify(queryResults?.value))
		// 	return;
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

// TODO use zod

type BlockConfig = {
	colWidths: Record<number, number>;
};

const defaultBlockConfig: BlockConfig = {
	colWidths: {},
};

const getConfigFromStr = (configLine: string) => {
	try {
		const parsed = JSON.parse(configLine) as BlockConfig;
		return { ...defaultBlockConfig, ...parsed };
	} catch (_) {
		return { ...defaultBlockConfig };
	}
};

type SetConfigProps = {
	source: string;
	sourcePath: string;
	config: BlockConfig;
	sourceLineStart: number;
	sourceLineEnd: number;
	plugin: Plugin;
};
const setConfig = async ({
	source,
	sourcePath,
	config,
	sourceLineStart,
	sourceLineEnd,
	plugin,
}: SetConfigProps) => {
	const lines = source.split("\n");
	const foundConfigLineIndex = lines.findIndex((ln) => ln.startsWith("//BP "));
	const configLineIndex =
		foundConfigLineIndex === -1 ? lines.length : foundConfigLineIndex;
	const configStr = JSON.stringify(config);
	lines[configLineIndex] = "//BP " + configStr;

	const file = plugin.app.vault.getFileByPath(sourcePath);
	if (!file) {
		// TODO handle better
		console.error("Could not find file for current code block");
		return;
	}
	await plugin.app.vault.process(file, (data) => {
		console.log("hi");
		const lines = data.split("\n");
		const foundConfigLineIndex = lines.findIndex((ln) =>
			ln.startsWith("//BP ")
		);
		// TOD won't work
		const configLineIndex =
			foundConfigLineIndex === -1 ? sourceLineEnd : foundConfigLineIndex;
		const configStr = JSON.stringify(config);

		const existingConfigLine = lines[configLineIndex];
		const startIndex = existingConfigLine.indexOf("//BP");
		if (startIndex === -1) {
			lines[configLineIndex] += "\n//BP " + configStr + "\n";
			return lines.join("\n");
		}

		lines[configLineIndex] =
			existingConfigLine.slice(0, startIndex) + "//BP " + configStr;

		return lines.join("\n");
	});

	// const scroll = editor.getScrollInfo().top;
	// editor.replaceRange(
	// 	newSource,
	// 	{ ch: 0, line: sourceLineStart },
	// 	{ ch: NaN, line: sourceLineEnd }
	// );

	// window.setTimeout(() => {
	// 	editor.scrollTo(null, scroll);
	// }, 0);
};

type UpdateConfigFunction = (
	cb: (current: BlockConfig) => BlockConfig
) => Promise<void>;
