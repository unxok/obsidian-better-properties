export const createInitialEls = () => {
	const containerEl = createDiv({
		cls: "better-properties-metaview-container",
	});
	const contentEl = containerEl.createDiv({
		cls: "better-properties-metaview-content",
	});
	const bottomToolbarEl = containerEl.createDiv({
		cls: "better-properties-metaview-toolbar",
	});
	const tableEl = contentEl.createEl("table", {
		cls: "better-properties-metaview-table",
	});
	const tableHeadEl = tableEl.createEl("thead", {
		cls: "better-properties-metaview-table-head",
	});
	const tableHeadRowEl = tableHeadEl.createEl("tr", {
		cls: "better-properties-metaview-table-head-row",
	});
	const tableBodyEl = tableEl.createEl("tbody", {
		cls: "better-properties-metaview-table-body",
	});
	return {
		containerEl,
		contentEl,
		bottomToolbarEl,
		tableEl,
		tableHeadEl,
		tableHeadRowEl,
		tableBodyEl,
	};
};
