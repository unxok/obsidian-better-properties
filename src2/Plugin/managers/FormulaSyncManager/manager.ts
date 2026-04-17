import { BetterProperties } from "#/Plugin";
import { Component, EventRef, TFile } from "obsidian";
import typeKey from "#/Plugin/managers/PropertyTypeManager/customPropertyTypes/Formula/type";

export class FormulaSyncManager extends Component {
	constructor(public plugin: BetterProperties) {
		super();
	}

	onload(): void {
		this.plugin.app.workspace.onLayoutReady(() => {
			this.buildCache();
			void this.updateCachedFilesFormulas();

			const refs: EventRef[] = [
				this.plugin.app.vault.on("delete", (file) => {
					if (!(file instanceof TFile)) return;
					if (!this.cache.has(file.path)) return;
					this.cache.delete(file.path);
				}),
				this.plugin.app.vault.on("create", (file) => {
					if (!(file instanceof TFile)) return;
					if (file.extension.toLocaleLowerCase() !== "md") return;
					if (!this.getFileFormulaProperties(file.path).length) return;
					this.cache.add(file.path);
				}),
				this.plugin.app.vault.on("rename", (file, oldPath) => {
					if (!this.cache.has(oldPath)) return;
					this.cache.delete(oldPath);
					this.cache.add(file.path);
				}),
				this.plugin.app.metadataCache.on("changed", async (file) => {
					if (!(file instanceof TFile)) return;
					if (file.extension.toLocaleLowerCase() !== "md") return;
					if (!this.getFileFormulaProperties(file.path).length) return;
					this.cache.add(file.path);
				}),
				// the events above always fire before this,
				// so the cache should always be up to date before calling updateCachedFilesFormulas
				this.plugin.app.metadataCache.on("resolved", async () => {
					await this.updateCachedFilesFormulas();
				}),
			];

			refs.forEach((ref) => this.registerEvent(ref));
		});
	}

	/**
	 * The cache of file paths that contain Formula properties
	 */
	cache: Set<string> = new Set();

	/**
	 * Loops through the metadatacache and adds all files' paths that have formula properties to the cache
	 */
	buildCache() {
		const { plugin, cache } = this;
		for (const path in plugin.app.metadataCache.fileCache) {
			if (!this.getFileFormulaProperties(path).length) continue;
			cache.add(path);
		}
	}

	/**
	 * Gets the data for the Formula properties in a given file
	 */
	getFileFormulaProperties(
		path: string
	): { property: string; value: unknown; formula: string }[] {
		const { plugin } = this;
		const { metadataCache, metadataTypeManager } = plugin.app;
		const { hash } = metadataCache.fileCache[path];
		if (!hash) return [];

		const { frontmatter } = metadataCache.metadataCache[hash];
		if (!frontmatter) return [];

		return Object.entries(frontmatter)
			.filter(([property]) => {
				const assignedWidget = metadataTypeManager.getAssignedWidget(property);
				return assignedWidget === typeKey;
			})
			.map(([property, v]) => {
				const value = v as unknown;
				const { formula } = plugin.propertyTypeManager.getPropertyTypeSettings(
					property,
					typeKey
				);

				return { property, value, formula };
			});
	}

	/**
	 * Calculates and diffs Formula properties in the cached files and applies the metadata changes if needed
	 */
	async updateCachedFilesFormulas() {
		const { plugin } = this;
		const { workspace, fileManager, vault } = plugin.app;

		const { lastOpenFiles } = workspace.recentFileTracker;
		const paths = [...this.cache].toSorted((a, b) => {
			return lastOpenFiles.indexOf(a) - lastOpenFiles.indexOf(b);
		});

		await Promise.all(
			paths.map(async (path) => {
				const properties = this.getFileFormulaProperties(path);
				if (!properties.length) return;

				const containingFile = vault.getFileByPath(path);
				if (!containingFile) return;

				const results = properties.map(({ formula }) =>
					plugin.baseUtilityManager.evaluateFormula({ formula, containingFile })
				);

				const isChanged = results.some((result, i) => {
					const normalized =
						plugin.baseUtilityManager.normalizeFormulaValue(result);
					return (
						JSON.stringify(normalized) !== JSON.stringify(properties[i].value)
					);
				});
				if (!isChanged) return;

				await fileManager.processFrontMatter(containingFile, (fm) => {
					[...results.values()].forEach((result, i) => {
						const normalized =
							plugin.baseUtilityManager.normalizeFormulaValue(result);
						const { property } = properties[i];
						(fm as Record<string, unknown>)[property] = normalized;
					});
				});
			})
		);
	}
}
