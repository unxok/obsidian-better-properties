import {
	Modal,
	ButtonComponent,
	Plugin,
	MarkdownPostProcessorContext,
	Component,
	MarkdownRenderChild,
	MarkdownRenderer,
	App,
	MarkdownView,
} from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	BetterPropertiesSettingsTab,
	getDefaultSettings,
} from "./settings";
import {
	registerCustomPropertyTypeWidgets,
	sortAndFilterRegisteredTypeWidgets,
	unregisterCustomPropertyTypeWidgets,
	wrapAllPropertyTypeWidgets,
} from "~/CustomPropertyTypes/register";
import {
	customizePropertyEditorMenu,
	patchMetadataEditor,
} from "~/MetadataEditor";
import { PropertyWidget } from "obsidian-typings";
import { PropertySuggestModal } from "~/classes/InputSuggest/PropertySuggest";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { patchMetadataCache } from "~/MetadataCache";
import * as v from "valibot";
import { openRenameModal } from "~/MetadataEditor/propertyEditorMenu/rename";
export class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = getDefaultSettings();
	disabledTypeWidgets: Record<string, PropertyWidget> = {};

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingsTab(this));
		registerCustomPropertyTypeWidgets(this);
		wrapAllPropertyTypeWidgets(this);
		sortAndFilterRegisteredTypeWidgets(this);
		this.setupCommands();
		this.app.workspace.onLayoutReady(async () => {
			customizePropertyEditorMenu(this);
			patchMetadataEditor(this);
			patchMetadataCache(this);
			this.rebuildLeaves();
		});
		this.handlePropertyLabelWidth();

		this.registerMarkdownCodeBlockProcessor("script", (source, el, ctx) => {
			new Script(this, el, source, ctx);
		});
		window.CodeMirror.defineMode("script", (config) =>
			window.CodeMirror.getMode(config, "javascript")
		);
	}

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	refreshPropertyEditors(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			const me = leaf.view.metadataEditor;
			if (!me) return;
			me.synchronize(
				me.properties.reduce((acc, { key, value }) => {
					acc[key] = value;
					return acc;
				}, {} as Record<string, unknown>)
			);
		});
	}

	setupCommands(): void {
		this.addCommand({
			id: "refresh-property-editors",
			name: "Refresh Property Editors",
			callback: () => {
				this.refreshPropertyEditors();
			},
		});
		this.addCommand({
			id: "rebuild-views",
			name: "Rebuild views",
			callback: () => {
				this.rebuildLeaves();
			},
		});
		this.addCommand({
			id: "open-property-settings",
			name: "Open property settings",
			callback: () => {
				const modal = new PropertySuggestModal(this);
				modal.onChooseItem = (item) => {
					modal.close();
					showPropertySettingsModal({
						plugin: this,
						property: item.name,
					});
				};
				modal.open();
			},
		});
		this.addCommand({
			id: "rename-property",
			name: "Rename property",
			callback: () => {
				const modal = new PropertySuggestModal(this);
				modal.onChooseItem = (item) => {
					modal.close();
					openRenameModal({
						plugin: this,
						property: item.name,
					});
				};
				modal.open();
			},
		});
	}

	handlePropertyLabelWidth(): void {
		this.updateSettings((prev) => ({
			...prev,
			defaultLabelWidth: document.body.style.getPropertyValue(
				"---metadata-label-width"
			),
		}));
		const updateDomMetadataLabelWidth = (width: number | undefined) => {
			document.body.style.setProperty(
				"--metadata-label-width",
				width === undefined ? this.settings.defaultLabelWidth : width + "px"
			);
		};
		this.app.workspace.on(
			"better-properties:property-label-width-change",
			(propertyLabelWidth) => {
				updateDomMetadataLabelWidth(propertyLabelWidth);
				this.updateSettings((prev) => ({ ...prev, propertyLabelWidth }));
			}
		);
		updateDomMetadataLabelWidth(this.settings.propertyLabelWidth);
	}

	onunload(): void {
		unregisterCustomPropertyTypeWidgets(this);
		window.CodeMirror.defineMode("script", (config) =>
			window.CodeMirror.getMode(config, "null")
		);
	}

	async onExternalSettingsChange() {
		await this.loadSettings();
	}

	async loadSettings() {
		const loaded = await this.loadData();

		// no settings yet, use default
		if (!loaded) {
			this.settings = getDefaultSettings();
			return;
		}

		const parsed = v.safeParse(betterPropertiesSettingsSchema, loaded);
		// settings are valid, so use them
		if (parsed.success) {
			this.settings = parsed.output;
			return;
		}

		// settings invalid, warn user and offer options
		const msg0 = "Better Properties: Invalid plugin settings detected!";
		const msg1 =
			"This likely happened because you modified the plugin's settings.json file directly. If not, please open an issue on the plugin's github repository";
		console.error(msg0 + "\n" + msg1);
		console.error(parsed.issues);
		const modal = new Modal(this.app);
		modal.setTitle(msg0);
		modal.contentEl.createEl("p", { text: msg1 });
		modal.contentEl.createEl("p", {
			text: "You can also reset the plugin's settings entirely by clicking the button below.",
		});
		const btnContainer = modal.contentEl.createDiv({
			cls: "modal-button-container",
		});
		new ButtonComponent(btnContainer)
			.setWarning()
			.setButtonText("Reset settings")
			.onClick(() => {
				this.settings = getDefaultSettings();
			});

		modal.open();
		return;
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
}

// TODO move to a separate plugin and make inline codeblock renderer
class Script {
	public app: App;
	public mdrc: MarkdownRenderChild;
	public component: Component;
	public containerEl: HTMLElement;
	constructor(
		public plugin: BetterProperties,
		public el: HTMLElement,
		public source: string,
		public ctx: MarkdownPostProcessorContext
	) {
		this.app = plugin.app;
		this.mdrc = new MarkdownRenderChild(el);
		this.component = new Component();
		this.containerEl = el.createDiv();
		this.mdrc.addChild(this.component);
		this.ctx.addChild(this.mdrc);

		// const eventRefs = [
		// 	plugin.app.vault.on("create", async () => await this.runCode(source)),
		// 	plugin.app.vault.on("modify", async () => await this.runCode(source)),
		// 	plugin.app.vault.on("delete", async () => await this.runCode(source)),
		// 	plugin.app.vault.on("rename", async () => await this.runCode(source)),
		// 	plugin.app.metadataCache.on(
		// 		"changed",
		// 		async () => await this.runCode(source)
		// 	),
		// ];

		// eventRefs.forEach((ref) => {
		// 	plugin.registerEvent(ref);
		// 	this.component.registerEvent(ref);
		// });

		if (!source) {
			this.renderHelp();
			return;
		}
		this.runCode(source);
	}

	async renderHelp() {
		const helpText = `## Usage\n - Enter \`console.log(script)\` to see what information is available to use in your script\n\n- To load external scripts: \`script.loadScript("path/to/main.js", "path/to/styles.css")\`\n\n## Typescript\n\`\`\`\ndeclare const script: {\n  app: App;\n  mdrc: MarkdownRenderChild;\n  component: Component;\n  plugin: Plugin;\n  el: HTMLElement;\n  source: string;\n  ctx: MarkdownPostProcessorContext;\n};\n\`\`\``;
		const container = this.el.createDiv();

		await MarkdownRenderer.render(
			this.plugin.app,
			helpText,
			container,
			this.ctx.sourcePath,
			this.component
		);
	}

	async runCode(code: string) {
		try {
			const func = eval(`async (script) => {${code}}`);
			this.containerEl.empty();
			await func(this);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Unknown Error";
			const fullMsg =
				"An error occurred when rendering script codeblock: " + msg;
			console.error(fullMsg);
			this.el.textContent = fullMsg;
		}
	}

	async loadScript(pathToMainJs: string, pathToStylesCss?: string) {
		const {
			plugin: {
				app: { vault },
			},
			el,
		} = this;
		const mainJsFile = vault.getFileByPath(pathToMainJs);
		if (!mainJsFile) {
			throw new Error("main.js file not found by path: " + pathToMainJs);
		}

		const stylesCssFile = pathToStylesCss
			? vault.getFileByPath(pathToStylesCss)
			: null;
		if (pathToStylesCss && !stylesCssFile) {
			throw new Error("styles.css file not found by path: " + pathToStylesCss);
		}

		if (stylesCssFile) {
			const styleEl = el.createEl("style");
			styleEl.innerHTML = await vault.read(stylesCssFile);
		}

		await this.runCode(await vault.read(mainJsFile));
	}

	obsidian() {
		return require("obsidian");
	}

	async refresh() {
		this.component.unload();
		this.el.empty();
		this.containerEl = this.el.createDiv();
		await this.runCode(this.source);
	}
}
