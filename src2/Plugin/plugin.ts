import {
	Modal,
	ButtonComponent,
	Plugin,
	WorkspaceLeaf,
	Constructor,
	Notice,
	MarkdownPostProcessorContext,
	Component,
	MarkdownRenderChild,
	MarkdownPreviewRenderer,
	MarkdownRenderer,
	loadPrism,
	App,
} from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	getDefaultSettings,
} from "./settings";
import {
	registerCustomPropertyTypeWidgets,
	sortRegisteredTypeWidgets,
	unregisterCustomPropertyTypeWidgets,
	wrapAllPropertyTypeWidgets,
} from "~/CustomPropertyTypes/register";
import {
	customizePropertyEditorMenu,
	patchMetadataEditor,
	refreshPropertyEditor,
} from "~/MetadataEditor";
import { around, dedupe } from "monkey-around";
import { monkeyAroundKey } from "~/lib/constants";

export class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = getDefaultSettings();

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	setupCommands(): void {
		this.addCommand({
			id: "refresh-property-editors",
			name: "Refresh Property Editors",
			callback: () => {
				Object.values(this.app.metadataTypeManager.properties).forEach(
					({ name }) => {
						refreshPropertyEditor(this, name);
					}
				);
			},
		});
	}

	async onload(): Promise<void> {
		await this.loadSettings();
		registerCustomPropertyTypeWidgets(this);
		wrapAllPropertyTypeWidgets(this);
		sortRegisteredTypeWidgets(this);
		this.setupCommands();
		this.app.workspace.onLayoutReady(async () => {
			customizePropertyEditorMenu(this);
			patchMetadataEditor(this);

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

	handlePropertyLabelWidth(): void {
		this.updateSettings((prev) => ({
			...prev,
			defaultPropertyLabelWidth: document.body.style.getPropertyValue(
				"---metadata-label-width"
			),
		}));
		this.app.workspace.on(
			"better-properties:property-label-width-change",
			(propertyLabelWidth) => {
				this.updateSettings((prev) => ({ ...prev, propertyLabelWidth }));
			}
		);
		if (this.settings.propertyLabelWidth !== undefined) {
			document.body.style.setProperty(
				"--metadata-label-width",
				this.settings.propertyLabelWidth + "px"
			);
		}
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

		const parsed = betterPropertiesSettingsSchema.safeParse(loaded);
		// settings are valid, so use them
		if (parsed.success) {
			this.settings = parsed.data;
			return;
		}

		// settings invalid, warn user and offer options
		const msg0 = "Better Properties: Invalid plugin settings detected!";
		const msg1 =
			"This likely happened because you modified the plugin's settings.json file directly. If not, please open an issue on the plugin's github repository";
		console.error(msg0 + "\n" + msg1);
		console.error(parsed.error);
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

	runCode(code: string) {
		try {
			const func = eval(`(script) => {${code}}`);
			func(this);
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

		this.runCode(await vault.read(mainJsFile));
	}

	refresh() {
		this.component.unload();
		console.log(this.component);
		this.el.empty();
		this.containerEl = this.el.createDiv();
		this.runCode(this.source);
	}
}
