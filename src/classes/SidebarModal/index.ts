import { App, Modal, setIcon } from "obsidian";

export class SidebarModal extends Modal {
	public tabHeaderEl: HTMLElement;
	public tabContentEl: HTMLElement;
	// private isFirstTabCreated = false;
	private activeTab: VerticalTab | null = null;

	constructor(app: App) {
		super(app);

		const { modalEl, contentEl } = this;
		modalEl.classList.add("mod-sidebar-layout");
		contentEl.classList.add("vertical-tabs-container");
		this.tabHeaderEl = contentEl.createDiv({ cls: "vertical-tab-header" });
		// const resizeHandle = contentEl.createEl("hr", {
		// 	cls: "vertical-tab-resize-handle",
		// });
		this.tabContentEl = contentEl
			.createDiv({ cls: "vertical-tab-content-container" })
			.createDiv({ cls: "vertical-tab-content" });
	}

	private setActiveTab(tab: VerticalTab): void {
		if (this.activeTab) {
			this.activeTab.tabEl.classList.remove("is-active");
		}

		tab.tabEl.classList.add("is-active");
		this.activeTab = tab;
	}

	createTabHeaderGroup(cb: (group: VerticalTabHeaderGroup) => void): this {
		const group = new VerticalTabHeaderGroup(
			this.tabHeaderEl,
			this.setActiveTab.bind(this)
		);
		cb(group);
		return this;
	}
}

class VerticalTabHeaderGroup {
	public headerGroupEl: HTMLElement;
	public titleEl: HTMLElement;
	public itemsContainerEl: HTMLElement;

	constructor(
		public verticalTabHeaderEl: HTMLElement,
		public setActiveTab: (tab: VerticalTab) => void
	) {
		this.headerGroupEl = verticalTabHeaderEl.createDiv({
			cls: "vertical-tab-header-group",
		});
		this.titleEl = this.headerGroupEl.createDiv({
			cls: "vertical-tab-header-group-title",
		});
		this.itemsContainerEl = this.headerGroupEl.createDiv({
			cls: "vertical-tab-header-group-items",
		});
	}

	setTitle(title: string): this {
		this.titleEl.textContent = title;
		return this;
	}

	createTab(cb: (tab: VerticalTab) => void): this {
		const verticalTab = new VerticalTab(this.headerGroupEl, this.setActiveTab);
		cb(verticalTab);
		return this;
	}
}

class VerticalTab {
	public tabEl: HTMLElement;
	public chevronEl: HTMLElement;
	constructor(
		public headerGroupEl: HTMLElement,
		public setActiveTab: (tab: VerticalTab) => void
	) {
		this.tabEl = headerGroupEl.createDiv({ cls: "vertical-tab-nav-item" });
		this.chevronEl = this.tabEl.createDiv({
			cls: "vertical-tab-nav-item-chevron",
		});
	}

	setTitle(title: string): this {
		this.tabEl.textContent = title;
		return this;
	}

	onSelect(cb: (e: MouseEvent) => void | Promise<void>): this {
		this.tabEl.addEventListener("click", async (e) => {
			this.setActiveTab(this);
			await cb(e);
		});
		return this;
	}
}
