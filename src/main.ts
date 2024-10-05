import { around, dedupe } from "monkey-around";
import {
	AbstractInputSuggest,
	App,
	Editor,
	editorLivePreviewField,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Menu,
	MenuPositionDef,
	Plugin,
	Scope,
	SearchComponent,
	setIcon,
	TextComponent,
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
import {
	CodeMirrorEditor,
	FileSuggestManager,
	MetadataEditor,
} from "obsidian-typings";
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

	removePatch: null | (() => void) = null;

	async onload() {
		await this.loadSettings();
		registerCustomWidgets(this);

		patchMenu(this);
		patchMetdataEditor(this);

		this.registerMarkdownCodeBlockProcessor(
			"better-properties",
			(source, el, ctx) => {
				el.empty();
				new TextComponent(el)
					.setValue("hello there")
					.onChange((v) => console.log("changed: v"))
					.then((cmp) => new FileSuggest(this.app, cmp));
			}
		);
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
		// menu.addItem((item) =>
		// 	item.setSection(sec).setDisabled(true).setTitle(sec)
		// );

		const commonProps = { plugin: this, menu, files, key };
		addChangeIcon(commonProps);
		addUsedBy(commonProps);
		addRename(commonProps);
		addMassUpdate(commonProps);
		addSettings(commonProps);
		addDelete(commonProps);
	};

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

type PatchedMetadataEditor = MetadataEditor & {
	toggleHiddenButton: HTMLDivElement;
	showHiddenProperties: boolean;
	toggleHiddenProperties(): void;
};

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
				plugin.setMenu(that, trueTarget);

				return exit();
			});
		},
	});

	plugin.register(removePatch);
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

type BaseWikilinkSuggestion = {
	/**
	 * Usually the path to the file, header, or section
	 * @remark If link is to non-existent file, this will be the link text
	 * @remark Typically, only non-markdown files will include the file extension here
	 */
	path: string | null;
	/**
	 * Each item in the array contains indexes of characters for sections in the `path` that match the search value
	 */
	matches: [matchStart: number, matchEnd: number][] | null;
	/**
	 * How accurate of a search this result is
	 * @remark Typically this is a float with 4 digits after the decimal
	 */
	score: number;
};

type FileWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "file";
	/**
	 * The corresponding file for this suggestion
	 */
	file: TFile;
	/**
	 * I assume this indicates if this file is part of the configured "Excluded files" setting
	 */
	downranked: boolean;
};

type LinkTextWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "linktext";
};

type HeadingWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "heading";
	/**
	 * The corresponding file for this suggestion
	 */
	file: TFile;
	/**
	 * The text of this heading
	 * @remark Does not include the "#" symbols that are part of MD syntax
	 */
	heading: string;
	/**
	 * The 1 based index of the type of heading this is.
	 * @example <h2 /> → 2
	 */
	level: number;
	/**
	 * The ending section of the link to this header. Starts at and includes the "#" to the end of the heading text
	 */
	subpath: string;
};

type Position = { line: number; column: number; offset: number };

type BlockWikilinkSuggestion = BaseWikilinkSuggestion & {
	type: "block";
	display: string;
	content: string;
	idMatch: string | null;
	node: {
		children: {
			position: Position;
			type: string;
			value: string;
		}[];
		depth: number;
		position: {
			start: Position;
			end: Position;
			index: unknown[];
		};
	};
	data: Record<string, any>;
};

type WikilinkSuggestion =
	| FileWikilinkSuggestion
	| LinkTextWikilinkSuggestion
	| HeadingWikilinkSuggestion
	| BlockWikilinkSuggestion;

const resolveWikilinkSuggestPrototype = (app: App) => {
	const { editorSuggest } = app.workspace;
	const wikilinkSuggest = editorSuggest.suggests[0];
	// const proto = Object.getPrototypeOf(wikilinkSuggest);
	// return proto as FileSuggest;
	return wikilinkSuggest as FileEditorSuggest;
};

export interface FileEditorSuggest extends EditorSuggest<WikilinkSuggestion> {
	app: App;
	context: {
		editor: Editor;
		end: { line: number; ch: number };
		file: TFile;
		query: string;
		start: { line: number; ch: number };
	};
	instructionsEl: HTMLElement;
	isOpen: boolean;
	limit: number;
	score: Scope;
	suggestEl: HTMLElement;
	/**
	 * Manages fetching of suggestions from metadatacache
	 */
	suggestManager: FileSuggestManager;
	constructor(app: App): FileEditorSuggest;
}

class FileSuggest extends AbstractInputSuggest<WikilinkSuggestion> {
	component: TextComponent | SearchComponent;
	suggestManager: FileSuggestManager;
	instructionsEl: HTMLElement;
	setInstructions: FileEditorSuggest["setInstructions"];
	constructor(app: App, component: TextComponent | SearchComponent) {
		super(app, component.inputEl);
		this.component = component;

		const proto = resolveWikilinkSuggestPrototype(app);
		this.onTrigger = proto.onTrigger;
		this.getSuggestions = (query) =>
			proto.getSuggestions({ query } as EditorSuggestContext);
		this.renderSuggestion = proto.renderSuggestion;
		// this.selectSuggestion = proto.selectSuggestion;
		this.suggestManager = proto.suggestManager;
		this.instructionsEl = proto.instructionsEl;
		this.setInstructions = proto.setInstructions;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null
	): EditorSuggestTriggerInfo | null {
		return null;
	}

	protected getSuggestions(
		query: string
	): WikilinkSuggestion[] | Promise<WikilinkSuggestion[]> {
		return [];
	}

	renderSuggestion(value: WikilinkSuggestion, el: HTMLElement): void {}
	selectSuggestion(
		value: WikilinkSuggestion,
		evt: MouseEvent | KeyboardEvent
	): void {
		this.component.setValue(value.path ?? "");
		this.component.onChanged();
	}
}

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
