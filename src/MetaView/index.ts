import BetterProperties from "@/main";
import { MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import { FileItem } from "./shared";
import { openConfigurationModal } from "./renderers/renderConfigModal";
import { addMatchingItems } from "./helpers/addMatchingItems";
import { getPaginatedItems } from "./helpers/getPaginatedItems";
import { parseBlockConfig } from "./helpers/parseBlockConfig";
import { parseSorter } from "./helpers/parseSorter";
import { createInitialEls } from "./renderers/createInitialEls";
import { renderBlankView } from "./renderers/renderBlankView";
import { renderConfigButton } from "./renderers/renderConfigButton";
import { renderHeaders } from "./renderers/renderHeaders";
import { renderRows } from "./renderers/renderRows";
import { getSaveBlockConfigFunc } from "./helpers/getSaveBlockConfigFunc";
import { renderToolbar } from "./renderers/renderToolbar";

type RenderMetaViewProps = {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	source: string;
	el: HTMLElement;
	ctx: MarkdownPostProcessorContext;
};
export const renderMetaView = ({
	plugin,
	mdrc,
	el,
	source,
	ctx,
}: RenderMetaViewProps) => {
	const blockConfig = parseBlockConfig(source);
	const saveBlockConfig = getSaveBlockConfigFunc({ plugin, ctx, el });
	const {
		fields,
		filters,
		folder,
		excludedFolders,
		sorter,
		pageNumber,
		pageSize,
	} = blockConfig;

	// if no columns specified, probably means a newly created block
	if (!fields.length) {
		renderBlankView(el, () =>
			openConfigurationModal({ plugin, blockConfig, saveBlockConfig })
		);
		return;
	}

	const {
		app: { vault, metadataCache },
	} = plugin;

	// TODO if blockConfig.folder, get from there instead... might be better perf
	const allFiles = vault.getMarkdownFiles();

	// will hold the matched FilteItems
	const items: FileItem[] = [];

	// add each file + metadata to items that matches filters and folder/excludedFolders
	addMatchingItems({
		items,
		allFiles,
		metadataCache,
		filters,
		folder,
		excludedFolders,
	});

	// sort matched items by the sorter
	items.sort(parseSorter(sorter));

	// get the matched items for the current page
	const paginatedItems = getPaginatedItems(items, pageNumber, pageSize);

	/* rendering */

	// replace 'edit block button' with custom configure button
	renderConfigButton({
		plugin,
		blockConfig,
		saveBlockConfig,
		elParent: el.parentElement!,
	});

	// create all intially needed elements
	const { tableHeadRowEl, tableBodyEl, containerEl, bottomToolbarEl } =
		createInitialEls();

	// render the table headers
	renderHeaders({ plugin, tableHeadRowEl, blockConfig, saveBlockConfig });

	// render the table rows (which render each cell within themselves)
	renderRows({
		plugin,
		mdrc,
		ctx,
		paginatedItems,
		tableBodyEl,
		fields,
	});

	// render the bottom toolbar
	renderToolbar({
		toolbarEl: bottomToolbarEl,
		pageNumber,
		pageSize,
		totalItems: items.length,
		blockConfig,
		saveBlockConfig,
	});

	// elements are attched to the codeblock element once they are *all* finished
	el.empty();
	el.appendChild(containerEl);
};
