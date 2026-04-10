import {
	Component,
	Constructor,
	Setting,
	stringifyYaml,
	TFile,
} from "obsidian";
import { ConfirmationModal } from "~/classes/ConfirmationModal";
import { around, dedupe } from "monkey-around";
import { customPropertyTypePrefix, monkeyAroundKey } from "~/lib/constants";
import "./index.css";
import {
	BasesFormula as IBasesFormula,
	EmbedRegistry,
	BasesFormula,
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

	onload(): void {
		this.applyVaultPatches();

		this.plugin.app.workspace.onLayoutReady(async () => {
			// TODO
			// might not need to be on layout ready
			// if no notes exist in the vault, wait until one is first created before applying patch
			void this.patchBaseResultsValue();
		});

		void this.patchBasesController();
	}

	onunload(): void {}

	createBasesFormula: (formula: string) => IBasesFormula = () => {
		throw new Error("Method not implemented");
	};

	async patchBasesController(): Promise<void> {
		const { plugin } = this;
		const controller = await this.evaluateBase({
			query: 'formulas:\n  fn: ""',
		});

		const formulaPrototype = Object.getPrototypeOf(
			controller.ctx.formulas["fn"]
		) as IBasesFormula;
		const basesFormulaConstructor =
			formulaPrototype.constructor as Constructor<IBasesFormula>;

		class BasesFormula extends basesFormulaConstructor {
			constructor(formula: string) {
				super(formula);
			}
		}

		this.createBasesFormula = (formula) => new BasesFormula(formula);

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
								new BasesFormula(formula),
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
	}

	/**
	 * Patches a Base's results map's value prototype to correctly get the value of Object/Array sub-properties when using object key access notation.
	 */
	async patchBaseResultsValue(): Promise<void> {
		const controller = await this.evaluateBase({
			query: ``,
		});

		if (!controller.results.size) {
			throw new Error(
				"Error: one note must exist in the vault before using this method"
			);
		}

		const local = controller.results.values().toArray()[0];
		const localContextPrototype = Object.getPrototypeOf(local) as typeof local;

		const uninstall = around(localContextPrototype, {
			getRawProperty: (old) =>
				dedupe(monkeyAroundKey, old, function (property) {
					// @ts-expect-error
					const that = this as typeof local;

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
	 * Evaluates an array of Bases formulas
	 */
	async evaluateFormulas({
		formulas,
		containingFile,
	}: {
		formulas: (string | BasesFormula)[];
		containingFile?: TFile;
	}) {
		const uuid = crypto.randomUUID();
		const queryJson = {
			formulas: formulas.reduce((acc, formula, index) => {
				const formulaStr = typeof formula === "string" ? formula : formula.text;
				acc[uuid + index.toString()] = formulaStr;
				return acc;
			}, {} as Record<string, string>),
		};
		const query = stringifyYaml(queryJson);
		const controller = await this.evaluateBase({
			query,
			containingFile,
		});

		// console.log("controller", controller);

		const formulaInstances = controller.ctx.formulas;
		Object.keys(this.plugin.getSettings().globalFormulas).forEach((key) => {
			delete formulaInstances[key];
		});

		const results = Object.values(formulaInstances).map((formula) => {
			// if (formula.formula.type === "invalid") {
			// 	return { error: "Invalid formula" };
			// }

			// const data = formula.getValue(controller.ctx.local);
			// return { data };

			return formula.getValue(controller.ctx.local);
		});

		return results;
	}

	/**
	 * TODO moot??
	 * Normalizes a value that was generated by a base.
	 *
	 * Bases transform arrays to always be made up of objects with a "data" property containing the items value. This function "unwraps" every array item to normalize the value back to it's raw value.
	 */
	normalizeValue(data: unknown): unknown {
		if (!data || typeof data !== "object") {
			return data;
		}

		// Base arrays always contain objects with a "data" key containing the value of the item
		if (Array.isArray(data)) {
			const arr = data as { data: unknown }[];
			return arr.map((v) => {
				if (typeof v !== "object") {
					throw new Error("Array item is not an object");
				}
				if (!("data" in v)) {
					throw new Error('Array item does not have a "data" property');
				}
				return this.normalizeValue(v.data);
			});
		}

		return Object.entries(data).reduce((acc, [key, value]) => {
			acc[key] = this.normalizeValue(value);
			return acc;
		}, {} as Record<string, unknown>);
	}

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

		const embedComponent = this.createEmbeddableBaseEditor({
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
		return embedComponent.controller;
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

			embedComponent = this.createEmbeddableBaseEditor({
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
					embedComponent = this.createEmbeddableBaseEditor({
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

	createEmbeddableBaseEditor({
		query = "",
		containerEl,
		containingFile,
	}: {
		query: string;
		containerEl: HTMLElement;
		containingFile?: TFile;
	}): BasesEmbedComponent {
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

		if (containingFile) {
			embedComponent.containingFile = containingFile;
			embedComponent.controller.currentFile = containingFile;
		}

		embedComponent.loadFile();

		componentContainerEl
			.querySelector("div.bases-view")
			?.addEventListener("scroll", () => {
				// TODO open PR to obsidian-typings

				embedComponent?.controller.view.updateVirtualDisplay();
			});

		this.fakeFileContent = "";

		return embedComponent;
	}

	fakeFileName: string = crypto.randomUUID();
	fakeFileContent: string = "";

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
