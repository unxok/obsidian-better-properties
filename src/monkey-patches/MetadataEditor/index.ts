import {
	doSync,
	getTemplateID,
	SyncPropertiesModal,
} from "@/classes/SyncPropertiesModal";
import { monkeyAroundKey } from "@/libs/constants";
import { text } from "@/i18Next";
import BetterProperties from "@/main";
import { around, dedupe } from "monkey-around";
import {
	WorkspaceLeaf,
	setIcon,
	Menu,
	ProgressBarComponent,
	Plugin,
	TFile,
} from "obsidian";
import { MetadataEditor } from "obsidian-typings";
import { obsidianText } from "@/i18Next/defaultObsidian";

export type PatchedMetadataEditor = MetadataEditor & {
	// toggleHiddenButton: HTMLDivElement;
	moreOptionsButton: HTMLDivElement;
	showHiddenProperties: boolean;
	toggleHiddenProperties(): void;
};

export const patchMetdataEditor = (plugin: BetterProperties) => {
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
			this.containerEl.style.setProperty("--better-properties-hidden", "none");
		} else {
			this.containerEl.style.setProperty("--better-properties-hidden", "flex");
		}
		this.showHiddenProperties = !shouldHide;
	};

	const removePatch = patchLoad(MetadataEditorPrototype, plugin);

	plugin.register(removePatch);
};

const patchLoad = (
	MetadataEditorPrototype: PatchedMetadataEditor,
	plugin: BetterProperties
) => {
	return around(MetadataEditorPrototype, {
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

				const moreOptionsButton = createDiv({
					cls: "metadata-add-button text-icon-button",
					attr: { tabIndex: 0 },
				});
				const iconEl = moreOptionsButton.createSpan({
					cls: "text-button-icon",
				});
				moreOptionsButton.createSpan({
					text: text("buttonText.more"),
					cls: "text-button-label",
				});
				setIcon(iconEl, "more-horizontal");

				const onClickDoSync = async () => {
					const file = that.app.workspace.activeEditor?.file;
					if (!file) {
						new Notice(text("notices.noFileMetadataEditor"));
						return;
					}
					const metaCache = that.app.metadataCache.getFileCache(file);
					if (!metaCache) {
						new Notice(text("notices.noTemplateId"));
						return;
					}
					const parsedId = getTemplateID(metaCache, plugin);
					if (!parsedId) return;
					if (!plugin.settings.showSyncTemplateWarning) {
						await doSync(metaCache, plugin, parsedId);
						return;
					}
					new SyncPropertiesModal(plugin, that, metaCache, parsedId).open();
				};

				const reorder = (strat: ReorderKeysStrategy) => {
					const file = that.app.workspace.activeEditor?.file;
					if (!file) {
						new Notice(text("notices.noFileMetadataEditor"));
						return;
					}
					reorderKeys(strat, plugin, file);
				};

				moreOptionsButton.addEventListener("click", (e) => {
					new Menu()
						.addItem((item) =>
							item
								.setSection("show-hidden")
								.setTitle(text("metadataMoreOptionsMenu.showHidden"))
								.setIcon("eye-off")
								.setChecked(that.showHiddenProperties)
								.onClick(() => that.toggleHiddenProperties.call(that))
						)
						.addItem((item) =>
							item
								.setSection("properties-actions")
								.setTitle(text("metadataMoreOptionsMenu.syncProps"))
								.setIcon("arrow-right-left")
								.onClick(onClickDoSync)
						)
						.addItem((item) =>
							item
								.setSection("properties-actions")
								.setTitle(text("metadataMoreOptionsMenu.reorderProps"))
								.setIcon("sort-asc")
								.setSubmenu()
								.setNoIcon()
								.addItem((sub) =>
									sub
										.setTitle(text("metadataMoreOptionsMenu.reorderByNameAZ"))
										.onClick(() => reorder("propertyAZ"))
								)
								.addItem((sub) =>
									sub
										.setTitle(text("metadataMoreOptionsMenu.reorderByNameZA"))
										.onClick(() => reorder("propertyZA"))
								)
								.addItem((sub) =>
									sub
										.setTitle(text("metadataMoreOptionsMenu.reorderByTypeAZ"))
										.onClick(() => reorder("typeAZ"))
								)
								.addItem((sub) =>
									sub
										.setTitle(text("metadataMoreOptionsMenu.reorderByTypeZA"))
										.onClick(() => reorder("typeZA"))
								)
								.addItem((sub) =>
									sub.setTitle(
										text("metadataMoreOptionsMenu.reorderByTemplate")
									)
								)
						)
						.showAtMouseEvent(e);
				});
				that.moreOptionsButton = moreOptionsButton;
				that.addPropertyButtonEl.insertAdjacentElement(
					"afterend",
					moreOptionsButton
				);
			});
		},
	});
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

type ReorderKeysStrategy =
	| "propertyAZ"
	| "propertyZA"
	| "typeAZ"
	| "typeZA"
	| "template";

const reorderKeys = (
	strategy: ReorderKeysStrategy,
	plugin: Plugin,
	file: TFile
) => {
	const metaCache = plugin.app.metadataCache.getFileCache(file);
	if (!metaCache) {
		new Notice(text("notices.noTemplateId"));
		return;
	}

	const { frontmatter } = metaCache;

	if (!frontmatter) return;

	const keys = Object.keys(frontmatter);

	let sorted: string[] = [];

	if (strategy === "propertyAZ" || strategy === "propertyZA") {
		sorted = keys.toSorted((a, b) => {
			if (strategy === "propertyAZ") {
				return a.localeCompare(b);
			}
			return b.localeCompare(a);
		});
	}

	if (strategy === "typeAZ" || strategy === "typeZA") {
		const types = Object.values(
			plugin.app.metadataTypeManager.registeredTypeWidgets
		).reduce((acc, cur) => {
			acc[cur.type] = {
				name: cur.name(),
				items: [],
			};
			return acc;
		}, {} as Record<string, { name: string; items: string[] }>);

		keys.forEach((key) => {
			const t = plugin.app.metadataTypeManager.getAssignedType(key);
			if (!types.hasOwnProperty(t)) {
				types[t] = {
					name: "unknown",
					items: [],
				};
			}
			types[t].items.push(key);
		});

		sorted = Object.values(types)
			.toSorted((a, b) =>
				strategy === "typeAZ"
					? a.name.localeCompare(b.name)
					: b.name.localeCompare(a.name)
			)
			.flatMap((t) => t.items);
	}

	// TODO handle template sort

	plugin.app.fileManager.processFrontMatter(file, (fm) => {
		const obj = fm as Record<string, unknown>;
		Object.keys(obj).forEach((key) => delete obj[key]);
		sorted.forEach((key) => (obj[key] = frontmatter[key]));
	});
};
