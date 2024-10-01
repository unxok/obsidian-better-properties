import { around, dedupe } from "monkey-around";
import { Menu, Plugin, View } from "obsidian";
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

// Remember to rename these classes and interfaces!

type PropertiesPlusPlusSettings = {
	propertySettings: Record<string, PropertySettings>;
};

const DEFAULT_SETTINGS: PropertiesPlusPlusSettings = {
	propertySettings: {},
};

export default class PropertiesPlusPlus extends Plugin {
	settings: PropertiesPlusPlusSettings = { ...DEFAULT_SETTINGS };

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

	onunload() {
		this.removePatch && this.removePatch();
		this.removeCustomWidgets();
	}

	async loadSettings() {
		// this.settings = Object.assign(
		// 	{},
		// 	DEFAULT_SETTINGS,
		// 	await this.loadData()
		// );
		const loaded = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...loaded };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async updateSettings(
		cb: (prev: PropertiesPlusPlusSettings) => PropertiesPlusPlusSettings
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
