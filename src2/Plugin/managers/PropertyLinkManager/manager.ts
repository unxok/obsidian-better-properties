import {
	Component,
	EditorSuggest,
	Instruction,
	MarkdownView,
	parseLinktext,
	setIcon,
	TFile,
	Workspace,
} from "obsidian";
import { BetterProperties } from "#/Plugin";
import { initPropertyLinkRender, PropertyLinkRenderer } from "./renderer";
import { around, dedupe } from "monkey-around";
import { monkeyAroundKey } from "~/lib/constants";
import {
	findNestedKey,
	getValueByKeys,
	parseObjectPathString,
	setValueByKeys,
} from "#/lib/utils";
import { obsidianText } from "~/i18next/obsidian";
import { EmbedMarkdownComponent } from "obsidian-typings";

export class PropertyLinkManager extends Component {
	constructor(public plugin: BetterProperties) {
		super();
	}

	onload(): void {
		const { plugin } = this;
		plugin.onFileEvent(() => {
			this.renderers.forEach((renderer) => {
				renderer.renderProperty();
			});
		});

		this.patchEditorSuggest();
		this.patchEmbedRegistry();
		this.patchWorkspace();
	}

	onunload(): void {}

	patchWorkspace(): void {
		const manager = this;

		const uninstaller = around(this.plugin.app.workspace, {
			openLinkText: (old) =>
				dedupe(
					monkeyAroundKey,
					old,
					function (linktext, sourcePath, newLeaf, openViewState) {
						// @ts-expect-error
						const that = this as Workspace;

						const oldReturn = () =>
							old.call(that, linktext, sourcePath, newLeaf, openViewState);

						const containingFile =
							manager.plugin.app.vault.getFileByPath(sourcePath);
						if (!containingFile) return oldReturn();

						const parsed = manager.parsePropertyLink(linktext, containingFile);
						if (!parsed) return oldReturn();

						return oldReturn().then(() => {
							const view = manager.plugin.app.workspace.getActiveFileView();
							if (!view || !(view instanceof MarkdownView)) return;

							const properties = view.metadataEditor.serialize();
							const keys = parseObjectPathString(parsed.property);
							const found = findNestedKey({
								obj: properties,
								keys,
								insensitive: true,
							});

							if (found) {
								view.metadataEditor.focusProperty(found);
								return;
							}

							setValueByKeys({
								obj: properties,
								keys,
								value: null,
								insensitive: true,
							});

							view.metadataEditor.synchronize(properties);
							view.metadataEditor.focusProperty(keys[0]);
						});
					}
				),
		});

		this.register(uninstaller);
	}

	patchEmbedRegistry(): void {
		const manager = this;

		const uninstaller = around(this.plugin.app.embedRegistry.embedByExtension, {
			md: (old) =>
				dedupe(monkeyAroundKey, old, (context, file, subpath) => {
					const oldReturn = () => old(context, file, subpath);

					if (!subpath || !context.sourcePath) {
						return oldReturn();
					}

					const containingFile = manager.plugin.app.vault.getFileByPath(
						context.sourcePath
					);
					if (!containingFile) return oldReturn();

					const parsed = manager.parsePropertyLink(
						file.path + subpath,
						containingFile
					);
					if (!parsed) return oldReturn();

					context.containerEl.classList.add(
						"better-properties-property-link-embed"
					);

					class CustomComponent
						extends Component
						implements EmbedMarkdownComponent
					{
						constructor(
							public parsed: NonNullable<
								ReturnType<typeof manager.parsePropertyLink>
							>
						) {
							super();
						}

						loadFile() {
							initPropertyLinkRender({
								component: this,
								containerEl: context.containerEl,
								file: this.parsed.file,
								hideKey: true,
								plugin: manager.plugin,
								property: this.parsed.property,
							});
						}
					}

					return new CustomComponent(parsed);
				}),
		});

		this.register(uninstaller);
	}

	patchEditorSuggest(): void {
		const { plugin } = this;
		const manager = this;

		// get the wikilink suggest
		const subpathSuggest = this.plugin.app.workspace.editorSuggest.suggests[0];
		if (!subpathSuggest) return;

		// cast to modified type to allow storing instructions
		type ModifiedEditorSuggest = EditorSuggest<unknown> & {
			instructions?: Instruction[];
		};

		const subpathSuggestPrototype = Object.getPrototypeOf(
			subpathSuggest
		) as typeof subpathSuggest;

		const uninstaller = around(subpathSuggestPrototype, {
			// patch to save instructions to the instance
			setInstructions(old) {
				return dedupe(monkeyAroundKey, old, function (instructions) {
					// @ts-expect-error
					const that = this as ModifiedEditorSuggest;
					that.instructions = [...instructions];

					return old.call(that, instructions);
				});
			},

			// patch to add instruction for property link
			open(old) {
				return dedupe(monkeyAroundKey, old, function () {
					// @ts-expect-error
					const that = this as ModifiedEditorSuggest;

					const { instructions } = that;
					if (!instructions) return old.call(that);

					const commands = new Set(instructions.map((i) => i.command));
					const { propertyLinkSyntax } = plugin.getSettings();

					// only add when "root" wikilink instructions are showing
					if (
						commands.has(
							obsidianText("editor.link-suggestion.label-type-block")
						)
					) {
						that.setInstructions([
							...instructions.filter(
								(c) => c.command !== `Type ${propertyLinkSyntax}`
							),
							{
								command: `Type ${propertyLinkSyntax}`,
								purpose: "to link property",
							},
						]);
					}

					return old.call(that);
				});
			},

			// patch to provide property link suggestions
			getSuggestions(old) {
				return dedupe(monkeyAroundKey, old, async function (context) {
					// @ts-expect-error
					const that = this as typeof subpathSuggest;

					const oldReturn = async () => old.call(that, context);

					const containingFile = context.editor.editorComponent?.file;
					if (!containingFile) return await oldReturn();

					const { propertyLinkSyntax: shortSyntax } = plugin.getSettings();
					const fullSyntax = manager.getFullPropertyLinkSyntax();
					const query =
						context.query.includes(shortSyntax) &&
						!context.query.includes(fullSyntax)
							? context.query.replace(shortSyntax, fullSyntax)
							: context.query;

					const parsed = manager.parsePropertyLink(query, containingFile);

					if (!parsed) return await oldReturn();

					const { property, file, path } = parsed;

					const { frontmatter = {} } =
						plugin.app.metadataCache.getFileCache(file) ?? {};
					const keys = Object.keys(frontmatter ?? {});

					const search = property.toLowerCase();
					const filteredKeys = search
						? keys.filter((k) => k.toLowerCase().includes(search))
						: keys;

					const suggestions: PropertySuggestion[] = filteredKeys.map((k) => {
						const rawValue = getValueByKeys({
							obj: frontmatter,
							keys: parseObjectPathString(k),
							insensitive: true,
						});

						const value =
							typeof rawValue === "object"
								? JSON.stringify(rawValue)
								: rawValue?.toString() ?? "";

						return {
							file,
							property: k,
							value,
							matches: null,
							path,
							score: 0,
							subpath: manager.getFullPropertyLinkSyntax() + k,
							type: "heading",
						};
					});
					return suggestions;
				});
			},

			// patch to handle rendering property link suggestions
			renderSuggestion(old) {
				return dedupe(monkeyAroundKey, old, function (suggestion, el) {
					// @ts-expect-error
					const that = this as typeof subpathSuggest;

					const oldReturn = () => old.call(that, suggestion, el);

					const { property, value } = suggestion as PropertySuggestion;
					if (!property) return oldReturn();

					const { icon } = plugin.app.metadataTypeManager.getWidget(
						plugin.app.metadataTypeManager.getAssignedWidget(property) ?? "text"
					);

					el.classList.add("mod-complex");
					const contentEl = el.createDiv("suggestion-content");
					const auxEl = el.createDiv("suggestion-aux");
					const flairEl = auxEl.createSpan({ cls: "suggestion-flair" });
					setIcon(flairEl, icon);
					contentEl.createDiv({
						cls: "suggestion-title",
						text: property,
					});
					contentEl.createDiv({ cls: "suggestion-note", text: value });
				});
			},
		});

		this.register(uninstaller);
	}

	/**
	 * Active PropertyLinkRenderers stored here so that we can re-render them when file events fire
	 */
	renderers: Set<PropertyLinkRenderer> = new Set();

	/**
	 * Gets the "full" syntax for linking properties, which just adds a hashtag to the beginning of propertyLinkSyntax
	 */
	getFullPropertyLinkSyntax(): string {
		return "#" + this.plugin.getSettings().propertyLinkSyntax;
	}

	/**
	 * Parsed linktext into the data needed to use in a PropertyLinkRenderer
	 * @note returns null if not a property link
	 */
	parsePropertyLink(
		linktext: string,
		containingFile: TFile
	): {
		property: string;
		file: TFile;
		path: string;
	} | null {
		const { plugin } = this;

		const fullSyntax = this.getFullPropertyLinkSyntax();

		if (!linktext.includes(fullSyntax)) return null;

		const { path, subpath } = parseLinktext(linktext);

		const property = subpath.slice(fullSyntax.length);

		const pathWithMd = path.toLowerCase().endsWith(".md") ? path : path + ".md";
		const file = plugin.app.metadataCache.getFirstLinkpathDest(
			path ? pathWithMd : containingFile.path,
			containingFile.path
		);
		if (!file) return null;

		return { property, file, path };
	}
}

/**
 * Modified suggestion for use in the EditorSuggest
 */
type PropertySuggestion = {
	file: TFile;
	property: string;
	value: string;
	matches: unknown;
	path: string;
	score: number;
	subpath: string;
	type: "heading";
};
