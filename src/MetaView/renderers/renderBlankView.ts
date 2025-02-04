export const renderBlankView = (el: HTMLElement, btnCallback: () => void) => {
	const container = el.createDiv({
		cls: "better-properties-metaview-blank-container",
	});
	container.createEl("h4", {
		text: "MetaView",
		cls: "better-properties-metaview-blank-container-title",
	});
	const descEl = container.createDiv({
		cls: "better-properties-metaview-blank-container-desc",
	});
	descEl.createDiv({ text: "Click the button below to get started!" });
	descEl.createDiv({
		text: 'Click the "settings" button for this block for more options.',
	});
	container
		.createDiv({
			cls: "better-properties-metaview-blank-container-btn-container",
		})
		.createEl("button", {
			text: "Configure view",
			cls: "better-properties-metaview-blank-container-btn",
		})
		.addEventListener("click", btnCallback);

	container.createEl("a", {
		text: "docs",
		// TODO link to specific section
		href: "https://github.com/unxok/obsidian-better-properties",
	});
	container.createEl("br");
};
