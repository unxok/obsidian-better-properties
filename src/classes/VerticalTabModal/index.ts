import { App, Modal, Platform, setIcon } from "obsidian";
import { Icon } from "~/lib/types/icons";

export class VerticalTabModal extends Modal {
	public tabHeaderEl: HTMLElement;
	public tabContentContainerEl: HTMLElement;
	public tabContentEl: HTMLElement;
	public backButtonEl: HTMLElement;
	public tabGroups: TabGroup[] = [];
	public activeTabIndex: number = 0;
	public onTabChangeCallback: () => void = () => {};

	onClose(): void {
		super.onClose.call(this);
		this.onTabChangeCallback();
	}

	onTabChange(cb: () => void): this {
		this.onTabChangeCallback = cb;
		return this;
	}
	getTabViewTitle(): string {
		throw new Error("Method not implemented!");
	}

	constructor(app: App) {
		super(app);
		const { modalEl, contentEl } = this;

		modalEl.classList.add("mod-sidebar-layout", "mod-settings");
		contentEl.classList.add("vertical-tabs-container");
		this.tabHeaderEl = contentEl.createDiv({ cls: "vertical-tab-header" });
		this.tabContentContainerEl = contentEl.createDiv({
			cls: "vertical-tab-content-container",
		});
		this.tabContentEl = this.tabContentContainerEl.createDiv({
			cls: "vertical-tab-content",
		});
		this.titleEl.empty();
		this.backButtonEl = this.titleEl.createDiv({
			cls: "modal-setting-back-button",
		});

		setIcon(
			this.backButtonEl.createDiv({ cls: "modal-setting-back-button-icon" }),
			"lucide-chevron-left" satisfies Icon
		);

		this.backButtonEl.addEventListener("click", () => {
			this.backButtonEl.remove();
			this.tabContentContainerEl.remove();
			this.contentEl.appendChild(this.tabHeaderEl);
			this.setTitle(this.getTabViewTitle());
		});
		this.titleEl.appendText("");
	}

	addTabGroup(cb: (group: TabGroup) => void): TabGroup {
		const group = new TabGroup(this, this.tabHeaderEl);
		this.tabGroups.push(group);
		cb(group);
		return group;
	}

	setTitle(title: string): this {
		const textNode = this.titleEl.childNodes
			.values()
			.find(({ nodeType }) => nodeType === Node.TEXT_NODE);
		if (!textNode) {
			throw new Error(
				"Better Properties: Text Node not found in titleEl of vertical tab modal"
			);
		}
		textNode.textContent = title;
		return this;
	}
}

class TabGroup {
	public groupEl: HTMLElement;
	public titleEl: HTMLElement;
	public itemsEl: HTMLElement;
	public tabs: Tab[] = [];

	constructor(public modal: VerticalTabModal, containerEl: HTMLElement) {
		this.groupEl = containerEl.createDiv({ cls: "vertical-tab-header-group" });
		this.titleEl = this.groupEl.createDiv({
			cls: "vertical-tab-header-group-title",
		});
		this.itemsEl = this.groupEl.createDiv({
			cls: "vertical-tab-header-group-items",
		});
	}

	setTitle(title: string): this {
		this.titleEl.textContent = title;
		return this;
	}

	addTab(cb: (tab: Tab) => void): this {
		const tab = new Tab(this, this.itemsEl);
		this.tabs.push(tab);
		cb(tab);
		return this;
	}

	then(cb: (group: this) => void): this {
		cb(this);
		return this;
	}
}

class Tab {
	labelEl: HTMLElement;
	title: string = "";
	private onSelectCallback: (event?: MouseEvent) => void | Promise<void> =
		() => {};

	constructor(public group: TabGroup, containerEl: HTMLElement) {
		this.labelEl = containerEl.createDiv({ cls: "vertical-tab-nav-item" });
		this.labelEl.addEventListener("click", (ev) => this.select(ev));
		setIcon(
			this.labelEl.createDiv({ cls: "vertical-tab-nav-item-chevron" }),
			"lucide-chevron-right" satisfies Icon
		);
	}

	setTitle(title: string): this {
		this.labelEl.childNodes.forEach((node) => {
			if (node.nodeType !== Node.TEXT_NODE) return;
			node.remove();
		});
		this.title = title;
		this.labelEl.prepend(title);
		return this;
	}

	onSelect(cb: (event?: MouseEvent) => void | Promise<void>): this {
		const { labelEl } = this;
		this.onSelectCallback = async (ev) => {
			const tabHeaderEl = labelEl.closest(".vertical-tab-header");
			if (!tabHeaderEl) {
				throw new Error("Tab header element not found");
			}
			tabHeaderEl
				.querySelectorAll(".vertical-tab-nav-item")
				.forEach((el) => el.classList.remove("is-active"));
			labelEl.classList.add("is-active");
			await cb(ev);
		};

		return this;
	}

	select(event?: MouseEvent) {
		const {
			title,
			group: { modal },
		} = this;

		modal.onTabChangeCallback();
		modal.onTabChangeCallback = () => {};

		if (Platform.isMobile) {
			modal.tabHeaderEl.remove();
			modal.contentEl.appendChild(modal.tabContentContainerEl);
			modal.backButtonEl.remove();
			modal.titleEl.prepend(modal.backButtonEl);
		}
		modal.setTitle(title);
		this.onSelectCallback(event);
	}

	then(cb: (tab: this) => void): this {
		cb(this);
		return this;
	}
}
