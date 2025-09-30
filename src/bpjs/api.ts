import { Component, TFile, CachedMetadata, debounce } from "obsidian";
import { PropertyComponent } from "~/classes/PropertyComponent";
import {
	findKeyValueByDotNotation,
	updateNestedObject,
} from "~/CustomPropertyTypes/utils";
import { tryCatch } from "~/lib/utils";
import BetterProperties from "~/main";

export const setupBpJsListeners = (plugin: BetterProperties) => {
	const reload = (bpjs: BpJsApi, file: TFile | null) => {
		if (file && !bpjs.subscribedPaths.has(file.path)) return;
		bpjs.empty();
		bpjs.component.unload();
		bpjs.component.load();
		bpjs.run(bpjs.code);
	};
	const reloadAll = debounce(
		(file: TFile | null) => {
			plugin.bpjsInstances.forEach((bpjs) => reload(bpjs, file));
		},
		150,
		true
	);

	plugin.registerEvent(
		plugin.app.metadataCache.on("changed", (file) => reloadAll(file))
	);
	plugin.registerEvent(
		plugin.app.metadataTypeManager.on("changed", () => reloadAll(null))
	);
	plugin.registerEvent(
		plugin.app.vault.on(
			"create",
			(file) => file instanceof TFile && reloadAll(file)
		)
	);
	plugin.registerEvent(
		plugin.app.vault.on(
			"delete",
			(file) => file instanceof TFile && reloadAll(file)
		)
	);
	plugin.registerEvent(
		plugin.app.vault.on(
			"modify",
			(file) => file instanceof TFile && reloadAll(file)
		)
	);
	plugin.registerEvent(
		plugin.app.vault.on(
			"rename",
			(file) => file instanceof TFile && reloadAll(file)
		)
	);
};

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
		plugin.bpjsInstances.add(this);
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

	public getMetadata({
		path,
		subscribe = true,
	}: {
		path?: string;
		subscribe?: boolean;
	}): CachedMetadata | null {
		const { metadataCache, vault } = this.plugin.app;
		const maybeFile = path ? vault.getFileByPath(path) : null;
		if (path && !maybeFile) {
			throw new Error(`Failed to get metadata: File not found at "${path}"`);
		}
		const trueFile = maybeFile ?? this.file;
		if (subscribe) {
			this.subscribedPaths.add(trueFile.path);
		}
		return metadataCache.getFileCache(trueFile);
	}

	public getProperty({
		property,
		path,
		subscribe = true,
	}: {
		property: string;
		path?: string;
		subscribe?: boolean;
	}): unknown {
		const metadata = this.getMetadata({ path, subscribe });
		const { value } = findKeyValueByDotNotation(
			property,
			metadata?.frontmatter ?? {}
		);
		return value;
	}

	public renderProperty({
		property,
		el,
		hideKey,
		path,
		subscribe = true,
	}: {
		property: string;
		el?: HTMLElement;
		hideKey?: boolean;
		path?: string;
		subscribe?: boolean;
	}): void {
		const { plugin } = this;
		const sourcePath: string = path ?? this.sourcePath;
		const value = this.getProperty({ property, path, subscribe });

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

		const allowedExtensions = ["js", "css"] as const;
		const extension = dotSections.reverse()[0].toLowerCase() as
			| (typeof allowedExtensions)[number]
			| (string & {});
		if (
			!allowedExtensions.includes(
				extension as (typeof allowedExtensions)[number]
			)
		) {
			const allowedExtensionsString = allowedExtensions.reduce((acc, ext) => {
				const quoted = `"${ext}"`;
				if (!acc) return quoted;
				return `${acc}, ${quoted}`;
			}, "");
			throw new Error(
				`Failed to import module: Got extension ".${extension}". Allowed extensions are ${allowedExtensionsString}`
			);
		}
		const file = vault.getFileByPath(path);
		if (!file) {
			throw new Error(
				`Failed to import module: File not found at path "${path}"`
			);
		}

		const content = await vault.cachedRead(file);

		this.subscribedPaths.add(file.path);

		if (extension === "js") {
			const exportDefaultRegex = /^export\s+default\s+/gm;
			const contentCommonJs = content.replace(
				exportDefaultRegex,
				"module.exports = "
			);

			const module: {
				exports?: unknown;
			} = {};

			eval(contentCommonJs); // should set module.exports
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
