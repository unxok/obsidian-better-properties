import {
	App,
	Component,
	Setting,
	TFile,
	FormulaContext,
	BasesEntry,
} from "obsidian";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { around, dedupe } from "monkey-around";
import { customPropertyTypePrefix, monkeyAroundKey } from "~/lib/constants";
import "./index.css";
import {
	type BasesContext,
	BasesFilter,
	type BasesFormula,
	EmbedRegistry,
} from "obsidian-typings";
import { BetterProperties } from "#/Plugin";
import { getValueByKeys, parseObjectPathString, waitUntil } from "#/lib/utils";
import { syncTryCatch } from "~/lib/utils";
import { text } from "#/i18n";

type BasesEmbedComponent = ReturnType<
	EmbedRegistry["embedByExtension"]["base"]
>;

export class BaseUtilityManager extends Component {
	constructor(public plugin: BetterProperties) {
		super();
	}

	/**
	 * Runs after `onload()` has finished
	 */
	afterLoad: () => void = () => {};

	async onload(): Promise<void> {
		this.applyVaultPatches();

		await this.patchBasesController();
		this.patchBaseResultsValue();
		this.afterLoad();
	}

	onunload(): void {}

	/**
	 * Evaluates a Base formula
	 */
	evaluateFormula({
		formula,
		containingFile,
	}: {
		formula: string | BasesFormula;
		containingFile?: TFile;
	}) {
		const formulaInstance =
			typeof formula === "string" ? this.createBasesFormula(formula) : formula;

		const context = this.createBasesContext(
			containingFile ?? this.getFakeFile()
		);
		return formulaInstance.getValue(context.local);
	}

	/**
	 * Creates a Base formula
	 */
	createBasesFormula: (formula: string) => BasesFormula = () => {
		throw new Error("Method not implemented");
	};

	/**
	 * Creates a Base context
	 */
	createBasesContext: (file: TFile) => BasesContext = () => {
		throw new Error("Method not implemented");
	};

	/**
	 * Patches BasesController to provide support for global formulas. Also sets up `createBasesFormula()` and `createBasesContext()`
	 */
	async patchBasesController(): Promise<void> {
		const { plugin } = this;
		// const embedComponent = await this.evaluateBase({
		// 	query: 'formulas:\n  fn: ""',
		// });

		const containerEl = this.plugin.app.workspace.containerEl.createDiv({
			cls: "better-properties--hidden-base",
			attr: {
				"aria-hidden": "true",
			},
		});

		const embedComponent = await this.createEmbeddableBaseEditor({
			query: `formulas:\n  fn: ""`,
			containerEl,
		});

		const { controller } = embedComponent;
		interface IBasesFormula {
			new (formula: string): BasesFormula;
		}

		const formulaPrototype = Object.getPrototypeOf(
			controller.ctx.formulas["fn"]
		) as BasesFormula;

		const basesFormulaConstructor =
			formulaPrototype.constructor as IBasesFormula;
		this.createBasesFormula = (formula) => new basesFormulaConstructor(formula);

		interface IBasesContext {
			new (
				app: App,
				filter: BasesFilter | null,
				formulas: Record<string, BasesFormula>,
				file: TFile
			): BasesContext;
		}

		const contextPrototype = Object.getPrototypeOf(
			controller.ctx
		) as BasesContext;

		const basesContextConstructor =
			contextPrototype.constructor as IBasesContext;
		this.createBasesContext = (file) => {
			const globalFormulas = Object.entries(
				plugin.getSettings().globalFormulas
			).reduce((acc, [name, { formula }]) => {
				acc[name] = this.createBasesFormula(formula);
				return acc;
			}, {} as Record<string, BasesFormula>);
			return new basesContextConstructor(
				plugin.app,
				null,
				globalFormulas,
				file
			);
		};

		// console.log("controller", controller);

		// const formula = new BasesFormula("number()");
		// const formulaInstancePrototype = formula.formula;

		// const uninstallFormulaInstancePatch = () => {};

		const controllerPrototype = Object.getPrototypeOf(
			controller
		) as typeof controller;

		const manager = this;

		const uninstallControllerPatch = around(controllerPrototype, {
			// Allows non-built-in property types to have their widget type processed correctly
			getWidgetForIdent: (old) =>
				dedupe(monkeyAroundKey, old, function (property) {
					// @ts-expect-error
					const that = this as typeof controller;

					const widget = old.call(that, property);

					if (widget !== "text") return widget;

					const assignedWidget =
						plugin.app.metadataTypeManager.getAssignedWidget(property);
					if (!assignedWidget?.startsWith(customPropertyTypePrefix))
						return widget;

					return assignedWidget;
				}),
			// Adds global formulas to the base
			buildBasesContext: (old) => {
				return dedupe(monkeyAroundKey, old, function (ctx) {
					// @ts-expect-error
					const that = this as typeof controller;

					const built = old.call(that, ctx);

					const { globalFormulas } = manager.plugin.getSettings();

					const globalFormulasEntries = Object.entries(globalFormulas);

					if (!globalFormulasEntries.length || that.query instanceof Error) {
						return old.call(that, ctx);
					}

					if (!that.query) {
						throw new Error("controller.query is nullish");
					}

					that.query.formulas ??= {};

					const formulas = {
						...built.formulas,
						...Object.fromEntries(
							globalFormulasEntries.map(([name, { formula }]) => [
								name,
								manager.createBasesFormula(formula),
							])
						),
					};

					that.query.formulas = formulas;
					built.formulas = { ...formulas };

					return built;
				});
			},
		});

		const queryPrototype = Object.getPrototypeOf(
			controller.query
		) as typeof controller.query;
		if (!queryPrototype) {
			throw new Error("controller.query is nullish");
		}

		const uninstallQueryPatch = around(queryPrototype, {
			// Prevents global formulas from being saved to the file contents
			toString(old) {
				return dedupe(monkeyAroundKey, old, function () {
					// @ts-expect-error
					const that = this as typeof queryPrototype;

					const { globalFormulas } = plugin.getSettings();

					const copy = { ...that.formulas };

					Object.keys(globalFormulas).forEach((key) => {
						delete that.formulas[key];
					});

					const str = old.call(that);
					that.formulas = copy;
					return str;
				});
			},
		});

		this.register(uninstallControllerPatch);
		this.register(uninstallQueryPatch);
		embedComponent.unload();
		containerEl.remove();
	}

	/**
	 * Patches a Base's results map's value prototype to correctly get the value of Object/Array sub-properties when using object key access notation.
	 */
	patchBaseResultsValue(): void {
		class ConstructableBasesEntry extends BasesEntry {
			constructor(ctx: FormulaContext, file: TFile) {
				// @ts-expect-error Obsidian doesn't provide a type for the constructor
				super(ctx, file);
			}
		}

		const entryInstance = new ConstructableBasesEntry(
			{
				app: this.plugin.app,
			},
			this.getFakeFile()
		) as BasesEntry;

		const proto = Object.getPrototypeOf(
			Object.getPrototypeOf(entryInstance) as ConstructableBasesEntry
		) as BasesEntry;

		const uninstall = around(proto, {
			getRawProperty: (old) =>
				dedupe(monkeyAroundKey, old, function (property) {
					// @ts-expect-error
					const that = this as BasesEntry;

					const oldReturn = () => old.call(that, property);

					if (
						!property.includes(".") &&
						!(property.includes("[") && property.includes("]"))
					) {
						return oldReturn();
					}

					const parsed = syncTryCatch(() => {
						return parseObjectPathString(property);
					});

					if (parsed.error || !parsed.data) {
						return oldReturn();
					}

					const value = getValueByKeys({
						obj: that.frontmatter,
						keys: parsed.data,
						insensitive: true,
					});

					return value;
				}),
		});

		this.register(uninstall);
	}

	/**
	 * Creates a Base and waits for its results to finish querying
	 */
	async evaluateBase({
		query,
		containingFile,
	}: {
		query: string;
		containingFile?: TFile;
	}) {
		const containerEl = this.plugin.app.workspace.containerEl.createDiv({
			cls: "better-properties--hidden-base",
			attr: {
				"aria-hidden": "true",
			},
		});

		const embedComponent = await this.createEmbeddableBaseEditor({
			query,
			containerEl,
			containingFile,
		});

		await waitUntil(() => {
			return (
				!!embedComponent.controller.queue.queue &&
				!embedComponent.controller.queue.queue.runnable.running
			);
		});

		containerEl.remove();
		return embedComponent;
	}

	async openBaseEditorModal({
		query = "",
		onOpen,
		onClose,
	}: {
		query: string;
		onOpen?: (props: {
			modal: ConfirmationModal;
			embedComponent: BasesEmbedComponent;
		}) => void | Promise<void>;
		onClose?: (props: {
			modal: ConfirmationModal;
			embedComponent: BasesEmbedComponent;
		}) => void | Promise<void>;
	}) {
		const { app } = this.plugin;

		const modal = new ConfirmationModal(app);

		modal.modalEl.classList.add(
			"better-properties--bases-filter-editor-modal",
			"markdown-rendered"
		);

		modal.onOpen = async () => {
			let embedComponent: BasesEmbedComponent;

			const thisFileSetting = new Setting(modal.contentEl)
				.setName(
					window.createFragment((el) => {
						el.appendText("File to use as ");
						el.createEl("code", { text: text("common.this") });
					})
				)
				.setDesc(
					window.createFragment((el) => {
						el.appendText("The file to use as ");
						el.createEl("code", { text: text("common.this") });
						el.appendText(" in the base editor. For testing purposes only.");
					})
				);

			embedComponent = await this.createEmbeddableBaseEditor({
				query: query,
				containerEl: modal.contentEl,
			});

			thisFileSetting.addText((cmp) => {
				cmp.inputEl.addEventListener("blur", async (e) => {
					if (!(e.target instanceof HTMLInputElement)) return;
					const file = app.vault.getFileByPath(e.target.value);
					if (!file) return;
					const query = embedComponent?.controller.query?.toString() || "";
					embedComponent?.unload();
					embedComponent?.containerEl?.remove();
					embedComponent = await this.createEmbeddableBaseEditor({
						query,
						containerEl: modal.contentEl,
						containingFile: file,
					});
				});
			});

			if (onOpen) {
				await onOpen({ modal, embedComponent });
			}

			modal.onClose = async () => {
				if (!embedComponent) return;
				if (onClose) {
					await onClose({ modal, embedComponent });
				}
				embedComponent?.unload();
			};
		};

		modal.open();

		return modal;
	}

	/**
	 * Creates a Base by initializing a Base embed component with a fake file
	 */
	async createEmbeddableBaseEditor({
		query = "",
		containerEl,
		containingFile,
	}: {
		query: string;
		containerEl: HTMLElement;
		containingFile?: TFile;
	}): Promise<BasesEmbedComponent> {
		this.fakeFileContent = query;

		const componentContainerEl = containerEl.createDiv({
			cls: "better-properties--embeddable-base-editor-container",
		});

		const embedComponent = this.plugin.app.embedRegistry.embedByExtension[
			"base"
		](
			{ app: this.plugin.app, containerEl: componentContainerEl },
			this.getFakeFile(),
			""
		);

		// if (containingFile) {
		embedComponent.containingFile = containingFile ?? this.getFakeFile();
		embedComponent.controller.currentFile =
			containingFile ?? this.getFakeFile();
		// }

		await embedComponent.loadFile();

		componentContainerEl
			.querySelector("div.bases-view")
			?.addEventListener("scroll", () => {
				embedComponent?.controller.view.updateVirtualDisplay();
			});

		this.fakeFileContent = "";

		return embedComponent;
	}

	fakeFileName: string = crypto.randomUUID();
	fakeFileContent: string = "";

	/**
	 * Creates the fake file used in `createEmbeddableBaseEditor()`
	 */
	getFakeFile(): TFile {
		const { fakeFileName } = this;
		return {
			basename: fakeFileName,
			cache: () => {},
			deleted: false,
			extension: "base",
			getNewPathAfterRename: () => fakeFileName,
			getShortName: () => fakeFileName,
			name: fakeFileName + ".base",
			parent: null,
			path: fakeFileName + ".base",
			saving: false,
			setPath: () => {},
			stat: {
				ctime: -1,
				mtime: -1,
				size: 0,
			},
			updateCacheLimit: () => {},
			vault: this.plugin.app.vault,
		};
	}

	/**
	 * Patches Vault to prevent the fake file from being created/modified and allows the vault to be able to read the contents of the fake file despite it not being real
	 */
	applyVaultPatches() {
		const { plugin } = this;
		const fakeFile = this.getFakeFile();

		const manager = this;

		const uninstall = around(plugin.app.vault, {
			read: (old) =>
				dedupe(monkeyAroundKey, old, function (file) {
					// @ts-expect-error
					const that = this as typeof manager.plugin.app.vault;

					if (file.path === fakeFile.path) {
						return new Promise((res) => {
							res(manager.fakeFileContent);
						});
					}

					return old.call(that, file);
				}),
			cachedRead: (old) =>
				dedupe(monkeyAroundKey, old, function (file) {
					// @ts-expect-error
					const that = this as typeof manager.plugin.app.vault;

					if (file.path === fakeFile.path) {
						return new Promise((res) => res(manager.fakeFileContent));
					}

					return old.call(that, file);
				}),
			modify: (old) =>
				dedupe(monkeyAroundKey, old, function (file, data, options) {
					// @ts-expect-error
					const that = this as typeof plugin.app.vault;

					if (file.path === fakeFile.path)
						return new Promise<void>((res) => res());

					return old.call(that, file, data, options);
				}),
			create: (old) =>
				dedupe(monkeyAroundKey, old, function (path, data, options) {
					// @ts-expect-error
					const that = this as typeof plugin.app.vault;

					if (path === fakeFile.path)
						return new Promise<TFile>((res) => res(manager.getFakeFile()));

					return old.call(that, path, data, options);
				}),
		});

		this.register(uninstall);
	}
}
