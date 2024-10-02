import { around, dedupe } from "monkey-around";
import {
	App,
	MarkdownView,
	Menu,
	Plugin,
	TFile,
	View,
	WorkspaceLeaf,
} from "obsidian";
import { monkeyAroundKey, typeWidgetPrefix } from "./libs/constants";
import {
	addUsedBy,
	addRename,
	addDelete,
	addSettings,
	addMassUpdate,
} from "./libs/utils/augmentMedataMenu";
import { registerCustomWidgets } from "./typeWidgets";
import { PropertySettings } from "./libs/utils/augmentMedataMenu/addSettings";
import { MetadataEditor, WidgetEditorView } from "obsidian-typings";

// Remember to rename these classes and interfaces!

type BetterPropertiesSettings = {
	propertySettings: Record<string, PropertySettings>;
};

const DEFAULT_SETTINGS: BetterPropertiesSettings = {
	propertySettings: {},
};

export default class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = { ...DEFAULT_SETTINGS };

	menu: Menu | null = null;

	removePatch: null | (() => void) = null;

	async onload() {
		await this.loadSettings();
		this.patchMenu();
		registerCustomWidgets(this);

		getMetdataEditorPrototype(this.app);
	}

	onunload() {
		this.removePatch && this.removePatch();
		this.removeCustomWidgets();
	}

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
		const files: { hash: string; value: unknown; path: string }[] =
			Object.keys(mdc)
				.map((hash) => {
					const fm = mdc[hash].frontmatter ?? {};
					if (!fm?.hasOwnProperty(key)) {
						// obsidian doesn't allow properties with the same name different case
						// so try to find a key without regard to letter case
						const foundKey = Object.keys(fm).find(
							(k) => k.toLowerCase() === key.toLowerCase()
						);
						if (!foundKey) return null;
						return {
							hash,
							value: fm[foundKey],
						};
					}
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

		const sec = "Better Properties";
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

	patchMenu(): void {
		const setMenu = this.setMenu;
		this.removePatch = around(Menu.prototype, {
			showAtMouseEvent(old) {
				return dedupe(monkeyAroundKey, old, function (e) {
					// @ts-ignore Doesn't look like there's a way to get this typed correctly
					const that = this as Menu;
					const exit = () => {
						return old.call(that, e);
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
					setMenu(that, trueTarget);

					return exit();
				});
			},
		});
	}

	async loadSettings() {
		const loaded = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...loaded };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async updateSettings(
		cb: (prev: BetterPropertiesSettings) => BetterPropertiesSettings
	): Promise<void> {
		const newSettings = cb(this.settings);
		this.settings = { ...newSettings };
		await this.saveSettings();
	}

	removeCustomWidgets(): void {
		const mtm = this.app.metadataTypeManager;
		Object.keys(mtm.registeredTypeWidgets).forEach((key) => {
			if (!key.startsWith(typeWidgetPrefix)) return;
			delete mtm.registeredTypeWidgets[key];
		});
	}

	refreshPropertyEditor(property: string): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!leaf.view.hasOwnProperty("metadataEditor")) return;
			const view = leaf.view as View & {
				metadataEditor: {
					onMetadataTypeChange: (property: string) => void;
				};
			};

			// This is to force dropdowns to re-render with updated options
			// the easiest way I found was to emulate a type change
			view.metadataEditor.onMetadataTypeChange(property);
		});
	}
}

const getMetdataEditorPrototype = (app: App) => {
	// app.workspace.onLayoutReady(() => {
	// 	const leaf = app.workspace.getLeaf("tab");
	// 	// const view = app.viewRegistry.viewByType["markdown"]({
	// 	// 	containerEl: createDiv(),
	// 	// 	app: app,
	// 	// } as unknown as WorkspaceLeaf);
	// 	const view = app.viewRegistry.viewByType["markdown"](leaf);
	// 	const properties = app.viewRegistry.viewByType["file-properties"](leaf);
	// 	const proto = Object.getPrototypeOf(
	// 		// @ts-ignore
	// 		view.metadataEditor
	// 	) as MetadataEditor;
	// 	proto._children = [];
	// 	proto.owner = {
	// 		getFile: () => {},
	// 	} as MarkdownView;
	// 	proto.propertyListEl = createDiv();
	// 	proto.containerEl = createDiv();
	// 	proto.app = app;
	// 	proto.save = () => {
	// 		console.log("save called");
	// 	};
	// 	proto.properties = [{ key: "fizz", type: "text", value: "bar" }];
	// 	proto.rendered = [];
	// 	// proto.insertProperties({ foo: "bar" });
	// 	proto.load();
	// 	proto.synchronize({ foo: "bar" });
	// 	const metadataEditorRow = Object.getPrototypeOf(proto.rendered[0]) as typeof proto.rendered[0];
	// 	const old = metadataEditorRow.showPropertyMenu
	// 	metadataEditorRow.showPropertyMenu = (e) => {
	// 		console.log('hi');
	// 	}
	// 	console.log("properties: ", properties);
	// 	console.log("view: ", view);
	// 	console.log("proto: ", proto);
	// 	leaf.detach();
	// });
};
