import { setIcon, setTooltip } from "obsidian";
import { BlockConfig, SaveBlockConfig } from "../shared";

type RenderToolbarProps = {
	toolbarEl: HTMLElement;
	pageNumber: number;
	pageSize: number;
	totalItems: number;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
};
export const renderToolbar = ({
	toolbarEl,
	pageNumber,
	pageSize,
	totalItems,
	blockConfig,
	saveBlockConfig,
}: RenderToolbarProps) => {
	const totalPages = pageSize <= 0 ? 1 : Math.ceil(totalItems / pageSize);
	const getResultsText = () => {
		if (pageSize <= 0) return totalItems + " results";
		const start = (pageNumber - 1) * pageSize;
		const end = Math.min(totalItems, pageNumber * pageSize);
		return `${start + 1} - ${end} of ${totalItems} results`;
	};

	const navigate = async (page: number) => {
		blockConfig.pageNumber = page;
		await saveBlockConfig(blockConfig);
	};

	toolbarEl.createSpan({ text: getResultsText(), cls: "clickable-icon" });
	const paginationContainer = toolbarEl.createDiv({
		cls: "better-properties-metaview-pagination-container",
	});
	paginationContainer.createSpan(
		{
			cls: "clickable-icon",
		},
		(el) => {
			setIcon(el, "chevron-first");
			setTooltip(el, "First");
			el.addEventListener("click", async () => await navigate(1));
		}
	);
	paginationContainer.createSpan(
		{
			cls: "clickable-icon",
		},
		(el) => {
			setIcon(el, "chevron-left");
			setTooltip(el, "Previous");
			el.addEventListener(
				"click",
				async () => await navigate(Math.max(1, pageNumber - 1))
			);
		}
	);
	paginationContainer.createSpan({
		text: pageNumber.toString(),
		cls: "clickable-icon",
	});
	paginationContainer.createSpan({
		text: "of",
		cls: "clickable-icon mod-non-interactive",
	});
	paginationContainer.createSpan({
		text: totalPages.toString(),
		cls: "clickable-icon mod-non-interactive",
	});
	paginationContainer.createSpan({ cls: "clickable-icon" }, (el) => {
		setIcon(el, "chevron-right");
		setTooltip(el, "Next");
		el.addEventListener(
			"click",
			async () => await navigate(Math.min(totalPages, pageNumber + 1))
		);
	});
	paginationContainer.createSpan({ cls: "clickable-icon" }, (el) => {
		setIcon(el, "chevron-last");
		setTooltip(el, "Last");
		el.addEventListener("click", async () => await navigate(totalPages));
	});
};
