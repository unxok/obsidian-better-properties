import { Menu, Modal, setIcon, Setting, setTooltip } from "obsidian";
import { BlockConfig, SaveBlockConfig } from "../shared";
import { clampNumber } from "@/libs/utils/pure";
import BetterProperties from "@/main";
import { ConfirmationModal } from "@/classes/ConfirmationModal";

type RenderToolbarProps = {
	toolbarEl: HTMLElement;
	pageNumber: number;
	pageSize: number;
	totalItems: number;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
	plugin: BetterProperties;
};
export const renderToolbar = ({
	toolbarEl,
	pageNumber,
	pageSize,
	totalItems,
	blockConfig,
	saveBlockConfig,
	plugin,
}: RenderToolbarProps) => {
	const totalPages = pageSize <= 0 ? 1 : Math.ceil(totalItems / pageSize);
	const boundPageNumber = clampNumber(pageNumber, 1, totalPages);

	const navigate = async (page: number) => {
		blockConfig.pageNumber = page;
		await saveBlockConfig(blockConfig);
	};

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
				async () => await navigate(Math.max(1, boundPageNumber - 1))
			);
		}
	);
	paginationContainer.createSpan(
		{
			text: boundPageNumber.toString(),
			cls: "clickable-icon",
		},
		(el) => {
			el.addEventListener("click", (e) => {
				const menu = new Menu().setNoIcon();
				for (let i = 1; i < totalPages + 1; i++) {
					menu.addItem((item) =>
						item
							.setTitle(i.toString())
							.onClick(() => navigate(i))
							.setChecked(i === pageNumber)
					);
				}
				menu.showAtMouseEvent(e);
			});
		}
	);
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
			async () => await navigate(Math.min(totalPages, boundPageNumber + 1))
		);
	});
	paginationContainer.createSpan({ cls: "clickable-icon" }, (el) => {
		setIcon(el, "chevron-last");
		setTooltip(el, "Last");
		el.addEventListener("click", async () => await navigate(totalPages));
	});

	const getResultsText = () => {
		if (pageSize <= 0) return totalItems + " results";
		const start = (boundPageNumber - 1) * pageSize;
		const end = Math.min(totalItems, boundPageNumber * pageSize);
		return `${start + 1} - ${end} of ${totalItems} results`;
	};
	toolbarEl.createSpan(
		{ text: getResultsText(), cls: "clickable-icon" },
		(el) => {
			el.addEventListener("click", (e) => {
				const menu = new Menu().setNoIcon();
				const sizes = [5, 10, 15, 20, 0, NaN];

				sizes.forEach((n) => {
					const title =
						n === 0 ? "All" : Number.isNaN(n) ? "Other" : n.toString();

					menu.addItem((item) =>
						item.setTitle(title).onClick(async () => {
							if (!Number.isNaN(n)) {
								blockConfig.pageSize = n;
								await saveBlockConfig(blockConfig);
								return;
							}

							const modal = new ConfirmationModal(plugin.app);
							let newPageSize = blockConfig.pageSize;

							modal.onClose = async () => {
								blockConfig.pageSize = newPageSize;
								await saveBlockConfig(blockConfig);
							};

							modal.onOpen = () => {
								newPageSize = blockConfig.pageSize;
								modal.contentEl.empty();
								new Setting(modal.contentEl)
									.setName("Page size")
									.setDesc(
										"The number of items to show per page. Set to 0 to show all results."
									)
									.addText((cmp) =>
										cmp
											.setValue(blockConfig.pageSize.toString())
											.onChange((v) => (newPageSize = Number(v)))
									);
							};

							modal.createFooterButton((cmp) =>
								cmp.setButtonText("Close").onClick(() => modal.close())
							);

							modal.open();
						})
					);
				});

				menu.showAtMouseEvent(e);
			});
		}
	);
};
