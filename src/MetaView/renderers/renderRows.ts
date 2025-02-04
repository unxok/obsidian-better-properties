import BetterProperties from "@/main";
import { MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import { FileItem, Field } from "@/MetaView/shared";
import { renderCell } from "./renderCell";

export const renderRows = ({
	plugin,
	mdrc,
	ctx,
	paginatedItems,
	tableBodyEl,
	fields,
}: {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	ctx: MarkdownPostProcessorContext;
	paginatedItems: FileItem[];
	tableBodyEl: HTMLElement;
	fields: Field[];
}) => {
	for (let i = 0; i < paginatedItems.length; i++) {
		const item = paginatedItems[i];
		const tr = tableBodyEl.createEl("tr", {
			cls: "better-properties-metaview-table-row",
		});
		fields.forEach((col) => {
			const td = tr.createEl("td", {
				cls: "better-properties-metaview-table-cell",
			});
			const wrapperEl = td.createDiv({
				cls: "better-properties-metaview-table-cell-wrapper",
			});
			renderCell({
				plugin,
				mdrc,
				ctx,
				wrapperEl,
				item,
				col,
			});
		});
	}
};
