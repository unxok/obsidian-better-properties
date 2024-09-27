import { around, dedupe } from "monkey-around";
import {
	App,
	debounce,
	Editor,
	MarkdownEditView,
	MarkdownPreviewView,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TextComponent,
} from "obsidian";
import {
	metdataSectionId,
	monkeyAroundKey,
	typeWidgetPrefix,
} from "./lib/constants";
import {
	addUsedBy,
	addRename,
	addDelete,
	addSettings,
	addMassUpdate,
} from "./lib/utils/augmentMedataMenu";
import { registerCustomWidgets } from "./typeWidgets";

// Remember to rename these classes and interfaces!

interface PropertiesPlusPlusSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: PropertiesPlusPlusSettings = {
	mySetting: "default",
};

export default class PropertiesPlusPlus extends Plugin {
	settings: PropertiesPlusPlusSettings;

	menu: Menu | null = null;

	removePatch: null | (() => void) = null;

	setMenu = (menu: Menu, targetEl: HTMLElement) => {
		if (menu === this.menu) return;
		const { app } = this;
		const { metadataCache } = app;
		this.menu = menu;
		const container = targetEl.closest(
			"div.metadata-property[data-property-key]"
		)!;
		const key = container.getAttribute("data-property-key") ?? "";

		const { metadataCache: mdc, fileCache: fc } = metadataCache;
		const fcKeys = Object.keys(fc);
		const files = Object.keys(mdc)
			.map((hash) => {
				const fm = mdc[hash].frontmatter;
				if (!fm?.hasOwnProperty(key)) return null;
				return {
					hash,
					value: fm[key],
				};
			})
			.filter((o) => o !== null)
			.map((obj) => {
				const path = fcKeys.find((k) => fc[k].hash === obj.hash)!;
				return { ...obj, path };
			})
			.filter(({ path }) => !!path);

		const sec = "Properties++";
		menu.addItem((item) =>
			item.setSection(sec).setDisabled(true).setTitle(sec)
		);

		const commonProps = { plugin: this, menu, files, key };
		addUsedBy(commonProps);
		addRename(commonProps);
		addMassUpdate(commonProps);
		addSettings(commonProps);
		addDelete(commonProps);
	};

	async onload() {
		const { setMenu } = this;
		await this.loadSettings();

		registerCustomWidgets(this);

		this.removePatch = around(Menu.prototype, {
			showAtMouseEvent(old) {
				return dedupe(monkeyAroundKey, old, function (e) {
					const exit = () => {
						return old.call(this, e);
					};
					const { target } = e;
					const isHTML = target instanceof HTMLElement;
					const isSVG = target instanceof SVGElement;
					if (!isHTML && !isSVG) return exit();

					const isExact =
						target instanceof HTMLElement &&
						target.tagName.toLowerCase() === "span" &&
						target.classList.contains("metadata-property-icon");

					const trueTarget = isExact
						? target
						: target.closest<HTMLElement>(
								"span.metadata-property-icon"
						  );

					if (!trueTarget) return exit();
					setMenu(this, trueTarget); // or do whatever here...

					return exit();
				});
			},
		});
	}

	onunload() {
		this.removePatch && this.removePatch();
		this.removeCustomWidgets();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	removeCustomWidgets(): void {
		const mtm = this.app.metadataTypeManager;
		Object.keys(mtm.registeredTypeWidgets).forEach((key) => {
			if (!key.startsWith(typeWidgetPrefix)) return;
			delete mtm.registeredTypeWidgets[key];
		});
	}
}
