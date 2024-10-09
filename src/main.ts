import { around, dedupe } from "monkey-around";
import { Menu, Plugin, setIcon, View, WorkspaceLeaf } from "obsidian";
import { monkeyAroundKey, typeWidgetPrefix } from "./libs/constants";
import {
	addUsedBy,
	addRename,
	addDelete,
	addSettings,
	addMassUpdate,
} from "./libs/utils/augmentMedataMenu";
import { registerCustomWidgets } from "./typeWidgets";
import { MetadataEditor } from "obsidian-typings";
import {
	defaultPropertySettings,
	PropertySettings,
} from "./libs/PropertySettings";
import { addChangeIcon } from "./libs/utils/augmentMedataMenu/addChangeIcon";

type BetterPropertiesSettings = {
	propertySettings: Record<string, PropertySettings>;
};

const DEFAULT_SETTINGS: BetterPropertiesSettings = {
	propertySettings: {},
};

export default class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = { ...DEFAULT_SETTINGS };

	menu: Menu | null = null;

	async onload() {
		await this.loadSettings();
		registerCustomWidgets(this);

		patchMenu(this);
		patchMetdataEditor(this);

		this.listenPropertyMenu();
	}

	onunload() {
		this.removeCustomWidgets();
	}

	setMenu(menu: Menu, property: string /*targetEl: HTMLElement*/): void {
		if (menu === this.menu) return;
		const { app } = this;
		const { metadataCache } = app;
		this.menu = menu;
		// const container = targetEl.closest(
		// 	"div.metadata-property[data-property-key]"
		// )!;
		// const key = container.getAttribute("data-property-key") ?? "";
		const key = property;

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

		const commonProps = { plugin: this, menu, files, key };
		addChangeIcon(commonProps);
		addUsedBy(commonProps);
		addRename(commonProps);
		addMassUpdate(commonProps);
		addSettings(commonProps);
		addDelete(commonProps);
	}

	listenPropertyMenu(): void {
		this.registerEvent(
			this.app.workspace.on("file-property-menu", (menu, property) => {
				this.setMenu(menu, property);
			})
		);
	}

	// patchMenu(): void {
	// 	const setMenu = this.setMenu;
	// 	this.removePatch = around(Menu.prototype, {
	// 		showAtMouseEvent(old) {
	// 			return dedupe(monkeyAroundKey, old, function (e) {
	// 				// @ts-ignore Doesn't look like there's a way to get this typed correctly
	// 				const that = this as Menu;
	// 				const exit = () => {
	// 					return old.call(that, e);
	// 				};
	// 				const { target } = e;
	// 				const isHTML = target instanceof HTMLElement;
	// 				const isSVG = target instanceof SVGElement;
	// 				if (!isHTML && !isSVG) return exit();

	// 				const isExact =
	// 					target instanceof HTMLElement &&
	// 					target.tagName.toLowerCase() === "span" &&
	// 					target.classList.contains("metadata-property-icon");

	// 				const trueTarget = isExact
	// 					? target
	// 					: target.closest<HTMLElement>(
	// 							"span.metadata-property-icon"
	// 					  );

	// 				if (!trueTarget) return exit();
	// 				setMenu(that, trueTarget);

	// 				return exit();
	// 			});
	// 		},
	// 	});
	// }

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

	getPropertySetting(propertyName: string): PropertySettings {
		const lower = propertyName.toLowerCase();
		const existing =
			this.settings.propertySettings[lower] ?? defaultPropertySettings;
		return { ...existing };
	}

	async updatePropertySetting(
		propertyName: string,
		cb: (prev: PropertySettings) => PropertySettings
	): Promise<void> {
		const lower = propertyName.toLowerCase();
		const existing = this.settings.propertySettings[lower] ?? {
			...defaultPropertySettings,
		};
		const newSettings = cb(existing);
		return await this.updateSettings((prev) => ({
			...prev,
			propertySettings: {
				...prev.propertySettings,
				[lower]: {
					...newSettings,
				},
			},
		}));
	}

	removeCustomWidgets(): void {
		const mtm = this.app.metadataTypeManager;
		Object.keys(mtm.registeredTypeWidgets).forEach((key) => {
			if (!key.startsWith(typeWidgetPrefix)) return;
			delete mtm.registeredTypeWidgets[key];
		});
	}

	refreshPropertyEditor(property: string): void {
		const lower = property.toLowerCase();
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!leaf.view.hasOwnProperty("metadataEditor")) return;
			const view = leaf.view as View & {
				metadataEditor: {
					onMetadataTypeChange: (lower: string) => void;
				};
			};

			// This is to force dropdowns to re-render with updated options
			// the easiest way I found was to emulate a type change
			view.metadataEditor.onMetadataTypeChange(lower);
		});
	}
}

const patchMenu = (plugin: BetterProperties) => {
	const removePatch = around(Menu.prototype, {
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

				const container = trueTarget.closest(
					"div.metadata-property[data-property-key]"
				)!;
				const property =
					container.getAttribute("data-property-key") ?? "";
				// plugin.setMenu(that, trueTarget);
				plugin.app.workspace.trigger(
					"file-property-menu",
					that,
					property
				);

				return exit();
			});
		},
	});

	plugin.register(removePatch);
};

export type PatchedMetadataEditor = MetadataEditor & {
	toggleHiddenButton: HTMLDivElement;
	showHiddenProperties: boolean;
	toggleHiddenProperties(): void;
};

const patchMetdataEditor = (plugin: BetterProperties) => {
	const view = plugin.app.viewRegistry.viewByType["markdown"]({
		containerEl: createDiv(),
		app: plugin.app,
	} as unknown as WorkspaceLeaf);
	const MetadataEditorPrototype = Object.getPrototypeOf(
		// @ts-ignore
		view.metadataEditor
	) as PatchedMetadataEditor;

	MetadataEditorPrototype.toggleHiddenProperties = function () {
		const shouldHide = this.showHiddenProperties;
		if (shouldHide) {
			this.containerEl.style.setProperty(
				"--better-properties-hidden",
				"none"
			);
		} else {
			this.containerEl.style.setProperty(
				"--better-properties-hidden",
				"flex"
			);
		}
		this.showHiddenProperties = !shouldHide;
	};

	const removePatch = around(MetadataEditorPrototype, {
		load(old) {
			return dedupe(monkeyAroundKey, old, function () {
				// @ts-ignore
				const that = this as PatchedMetadataEditor;
				old.call(that);

				that.containerEl.style.setProperty(
					"--better-properties-hidden",
					"none"
				);
				that.showHiddenProperties = false;

				const toggleHiddenButton = createDiv({
					cls: "metadata-add-button text-icon-button",
					attr: { tabIndex: 0 },
				});
				const iconEl = toggleHiddenButton.createSpan({
					cls: "text-button-icon",
				});
				setIcon(iconEl, "eye");
				const labelEl = toggleHiddenButton.createSpan({
					cls: "text-button-label",
					text: "Show hidden",
				});
				toggleHiddenButton.addEventListener("click", () => {
					that.toggleHiddenProperties.call(that);
					const newIcon = that.showHiddenProperties
						? "eye-off"
						: "eye";
					labelEl.textContent = that.showHiddenProperties
						? "Collapse hidden"
						: "Show hidden";
					setIcon(iconEl, newIcon);
				});
				that.toggleHiddenButton = toggleHiddenButton;
				that.addPropertyButtonEl.insertAdjacentElement(
					"afterend",
					toggleHiddenButton
				);
			});
		},
	});

	plugin.register(removePatch);
};

// Might be useful later but not needed right now
// const getMetdataEditorPrototype = (app: App) => {
// 	app.workspace.onLayoutReady(() => {
// 		const leaf = app.workspace.getLeaf("tab");
// 		// const view = app.viewRegistry.viewByType["markdown"]({
// 		// 	containerEl: createDiv(),
// 		// 	app: app,
// 		// } as unknown as WorkspaceLeaf);
// 		const view = app.viewRegistry.viewByType["markdown"](leaf);
// 		const properties = app.viewRegistry.viewByType["file-properties"](leaf);
// 		const proto = Object.getPrototypeOf(
// 			// @ts-ignore
// 			view.metadataEditor
// 		) as MetadataEditor;
// 		proto._children = [];
// 		proto.owner = {
// 			getFile: () => {},
// 		} as MarkdownView;
// 		proto.addPropertyButtonEl
// 		proto.propertyListEl = createDiv();
// 		proto.containerEl = createDiv();
// 		proto.app = app;
// 		proto.save = () => {
// 			console.log("save called");
// 		};
// 		proto.properties = [{ key: "fizz", type: "text", value: "bar" }];
// 		proto.rendered = [];
// 		// proto.insertProperties({ foo: "bar" });
// 		proto.load();
// 		proto.synchronize({ foo: "bar" });
// 		const metadataEditorRow = Object.getPrototypeOf(proto.rendered[0]) as typeof proto.rendered[0];
// 		const old = metadataEditorRow.showPropertyMenu
// 		metadataEditorRow.showPropertyMenu = (e) => {
// 			console.log('hi');
// 		}
// 		console.log("properties: ", properties);
// 		console.log("view: ", view);
// 		console.log("proto: ", proto);
// 		leaf.detach();
// 	});
// };
