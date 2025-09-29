import { Component, TFile, CachedMetadata } from "obsidian";
import { PropertyComponent } from "~/classes/PropertyComponent";
import {
	findKeyValueByDotNotation,
	updateNestedObject,
} from "~/CustomPropertyTypes/utils";
import { tryCatch } from "~/lib/utils";
import BetterProperties from "~/main";

export class BpJsApi {
	public el: HTMLElement;
	public styleEl: HTMLStyleElement | undefined;

	public subscribedPaths: Set<string> = new Set();

	constructor(
		public plugin: BetterProperties,
		el: HTMLElement | undefined,
		public sourcePath: string,
		public component: Component,
		public code: string
	) {
		this.el = el?.createSpan() ?? createSpan();
		this.el.classList.add("better-properties-bpjs");
		this.styleEl = this.el.createEl("style");
		plugin.register(() => this.component.unload());
	}

	public empty(): void {
		this.el.empty();
		this.styleEl?.empty();
	}

	public get file(): TFile {
		const f = this.plugin.app.vault.getFileByPath(this.sourcePath);
		if (!f) {
			throw new Error(`File not found at path "${this.sourcePath}"`);
		}
		return f;
	}

	public get obsidian() {
		return require("obsidian");
	}

	public subscribe({
		callback,
		property,
		path,
	}: {
		callback: () => void;
		property?: string;
		path?: string;
	}): void {
		return;
		const { plugin, component } = this;
		const { metadataCache, metadataTypeManager, vault } = plugin.app;

		const maybeFile = path ? vault.getFileByPath(path) : null;
		if (path && !maybeFile) {
			throw new Error(`Failed to subscribe: File not found at path "${path}"`);
		}

		const file = maybeFile ?? this.file;

		if (property) {
			const parentProperty = property.split(".")[0];
			const metadataTypeManagerEventRef = metadataTypeManager.on(
				"changed",
				(key) => {
					if (key?.toLowerCase() !== parentProperty.toLowerCase()) return;
					metadataTypeManager.offref(metadataTypeManagerEventRef);
					this.component.unload();
					this.component.load();
					callback();
				}
			);
			component.registerEvent(metadataTypeManagerEventRef);
		}

		const metadataCacheEventRef = metadataCache.on("changed", (f) => {
			if (f !== file) return;
			metadataCache.offref(metadataCacheEventRef);
			this.component._events = this.component._events.filter(
				(ev) => ev !== metadataCacheEventRef
			);
			callback();
		});
		component.registerEvent(metadataCacheEventRef);

		const vaultRenameEventRef = vault.on("rename", (f) => {
			if (f !== file) return;
			vault.offref(vaultRenameEventRef);
			this.component._events = this.component._events.filter(
				(ev) => ev !== vaultRenameEventRef
			);
			callback();
		});
		component.registerEvent(vaultRenameEventRef);

		const vaultDeleteEventRef = vault.on("delete", (f) => {
			if (f !== file) return;
			vault.offref(vaultDeleteEventRef);
			this.component._events = this.component._events.filter(
				(ev) => ev !== vaultDeleteEventRef
			);
			callback();
		});
		component.registerEvent(vaultDeleteEventRef);
	}

	public getMetadata(path?: string): CachedMetadata | null {
		const { metadataCache, vault } = this.plugin.app;
		const file = path ? vault.getFileByPath(path) : null;
		if (path && !file) {
			throw new Error(`Failed to get metadata: File not found at "${path}"`);
		}
		return metadataCache.getFileCache(file ?? this.file);
	}

	public getProperty({
		property,
		path,
		subscribe,
	}: {
		property: string;
		path?: string;
		subscribe?: boolean;
	}): unknown {
		const metadata = this.getMetadata(path);
		// if (!metadata) return; //TODO should this throw?
		const { key, value } = findKeyValueByDotNotation(
			property,
			metadata?.frontmatter ?? {}
		);
		if (subscribe) {
			this.subscribe({
				property: key?.split(".")[0],
				path,
				callback: () => {
					this.component.unload();
					this.empty();
					this.run(this.code);
				},
			});
		}

		return value;
	}

	public renderProperty({
		property,
		el,
		hideKey,
		path,
	}: {
		property: string;
		el?: HTMLElement;
		hideKey?: boolean;
		path?: string;
	}): void {
		const { plugin } = this;
		const sourcePath: string = path ?? this.sourcePath;
		const value = this.getProperty({ property, path });

		const cmp = new InlinePropertyComponent(
			plugin,
			el ?? this.el,
			property,
			value,
			sourcePath,
			hideKey
		);

		cmp.onKeyChange(() => {
			if (!cmp.keyInputEl) return;
			cmp.keyInputEl.value = property;
		});

		this.subscribe({
			property,
			path,
			callback: () => {
				cmp.propertyEl?.remove();
				this.renderProperty({
					el,
					property,
					hideKey,
					path,
				});
			},
		});

		cmp.render();
	}

	public async import(path: string): Promise<unknown> {
		const { vault } = this.plugin.app;
		const lowerPath = path.toLowerCase();
		const dotSections = lowerPath.split(".");
		if (dotSections.length < 2) {
			throw new Error(
				`Failed to import module: No file extension was provided in the path "${path}"`
			);
		}
		const extension = dotSections.reverse()[0].toLowerCase() as
			| "js"
			| "css"
			| (string & {});
		if (!(extension === "js" || extension === "css")) {
			throw new Error(
				`Failed to import module: Expected extension ".js" or ".css" but got ".${extension}"`
			);
		}
		const file = vault.getFileByPath(path);
		if (!file) {
			throw new Error(
				`Failed to import module: File not found at path "${path}"`
			);
		}

		// const ref = vault.on("modify", async (f) => {
		// 	if (f !== file) return;
		// 	vault.offref(ref);
		// 	this.component.unload();
		// 	this.component.load();
		// 	this.empty();
		// 	await this.run(this.code);
		// });
		// this.component.registerEvent(ref);

		const content = await vault.cachedRead(file);

		if (extension === "js") {
			const module: {
				exports?: unknown;
			} = {};

			eval(content); // should set module.exports
			if (module.exports === undefined) {
				throw new Error(
					"Failed to import JS file: module.exports is undefined"
				);
			}
			return module.exports;
		}

		if (extension === "css") {
			if (this.styleEl) {
				this.styleEl.remove();
			}
			this.styleEl = this.el.parentElement!.createEl("style");
			this.styleEl.innerHTML = content;

			// TODO is there a way to get this to work? I would like to avoid innerHTML if possible
			// this.el.createEl("link", {
			// 	href: path,
			// 	type: "text/css",
			// 	attr: {
			// 		rel: "stylesheet",
			// 	},
			// });
		}

		// TODO? allow importing json and csv files
	}

	async run(code: string): Promise<void> {
		this.el.empty();
		// this.code = code;
		const { success, data, error } = await tryCatch(async () => {
			const fn = eval(code);
			if (typeof fn !== "function") {
				throw new Error(`Expect type "function" but got "${typeof fn}"`);
			}
			return await fn(this);
		});
		if (!success) {
			console.error(error);
			this.el.textContent = error;
			return;
		}
		if (data === undefined || data === null) return;
		this.el.textContent = data?.toString();
	}
}

class InlinePropertyComponent extends PropertyComponent {
	constructor(
		plugin: BetterProperties,
		containerEl: HTMLElement,
		key: string,
		value: unknown,
		sourcePath: string,
		public hideKey: boolean = false
	) {
		super(plugin, containerEl, key, value, sourcePath);

		this.onChange((v) => {
			const file = plugin.app.vault.getFileByPath(sourcePath);
			if (!file) {
				throw new Error(
					`Failed to update property value: File not found at path "${sourcePath}"`
				);
			}
			plugin.app.fileManager.processFrontMatter(file, (fm) => {
				updateNestedObject(fm, key, v);
				return fm;
			});
		});
	}

	render(): this {
		super.render();
		if (this.hideKey) {
			this.propertyEl?.setAttribute("data-better-properties-hide-key", "true");
		}
		return this;
	}
}
