import { App, Modal, setIcon } from "obsidian";

export class SidebarModal extends Modal {
	public tabHeaderEl: HTMLElement;
	public tabContentEl: HTMLElement;
	private activeTab: VerticalTab | null = null;
	public groups: VerticalTabHeaderGroup[] = [];

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

	protected setActiveTab(tab: VerticalTab): void {
		if (this.activeTab) {
			this.activeTab.tabEl.classList.remove("is-active");
		}

		tab.tabEl.classList.add("is-active");
		this.activeTab = tab;
	}

	createTabHeaderGroup(cb: (group: VerticalTabHeaderGroup) => void): this {
		const group = new VerticalTabHeaderGroup(
			this.tabHeaderEl,
			this.tabContentEl,
			this.setActiveTab.bind(this)
		);
		this.groups.push(group);
		cb(group);
		return this;
	}
}

class VerticalTabHeaderGroup {
	public headerGroupEl: HTMLElement;
	public titleEl: HTMLElement;
	public itemsContainerEl: HTMLElement;
	public tabs: VerticalTab[] = [];

	constructor(
		public verticalTabHeaderEl: HTMLElement,
		public tabContentEl: HTMLElement,
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
		const verticalTab = new VerticalTab(
			this.itemsContainerEl,
			this.tabContentEl,
			this.setActiveTab
		);
		this.tabs.push(verticalTab);
		cb(verticalTab);
		return this;
	}

	then(cb: (t: this) => void): this {
		cb(this);
		return this;
	}
}

class VerticalTab {
	public tabEl: HTMLElement;
	public chevronEl: HTMLElement;
	public onSelectCallback: (tabContentEl: HTMLElement) => void = () => {};
	constructor(
		public headerGroupEl: HTMLElement,
		public tabContentEl: HTMLElement,
		private setActiveTab: (tab: VerticalTab) => void
	) {
		this.tabEl = headerGroupEl.createDiv({ cls: "vertical-tab-nav-item" });
		this.chevronEl = this.tabEl.createDiv({
			cls: "vertical-tab-nav-item-chevron",
		});
		this.tabEl.addEventListener("click", async (e) => {
			this.setActiveTab(this);
			this.onSelectCallback(this.tabContentEl);
		});
	}

	setTitle(title: string): this {
		this.tabEl.insertAdjacentText("afterbegin", title);
		return this;
	}

	onSelect(cb: typeof this.onSelectCallback): this {
		this.onSelectCallback = cb;
		return this;
	}

	setActive(): this {
		this.setActiveTab(this);
		this.onSelectCallback(this.tabContentEl);
		return this;
	}

	then(cb: (t: this) => void): this {
		cb(this);
		return this;
	}
}
