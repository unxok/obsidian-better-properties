import { Component, debounce, Menu, MenuItem, WorkspaceLeaf } from "obsidian";
import { BetterProperties, BetterPropertiesSettings } from "#/Plugin";
import { MetadataEditor } from "obsidian-typings";
import { around, dedupe } from "monkey-around";
import { monkeyAroundKey } from "~/lib/constants";
import "./index.css";
import { clampNumber } from "#/lib/utils";

export class PropertiesEditorManager extends Component {
	constructor(public plugin: BetterProperties) {
		super();
	}

	onload(): void {
		this.patchMenu();
		this.patchMetadataEditor();
	}

	onunload(): void {}

	patchMetadataEditor(): void {
		const proto = resolveMetadataEditorPrototype(this.plugin);

		interface PatchedMetadataEditor extends MetadataEditor {
			resizerEl: HTMLElement | undefined;
		}

		const createResizer = (metadataEditor: PatchedMetadataEditor) => {
			metadataEditor.resizerEl?.remove();

			metadataEditor.resizerEl = metadataEditor.propertyListEl.createDiv({
				cls: "better-properties--metadata-editor-resizer",
				attr: {
					draggable: "true",
				},
			});

			const { resizerEl } = metadataEditor;
			let initialX = 0;
			let initialWidth = 0;
			let maxWidth = 0;
			let newWidth = 0;

			const getLabelWidth = () => {
				const keyEl = metadataEditor.propertyListEl.querySelector(
					".metadata-property-key"
				);
				if (!keyEl) {
					throw new Error(
						"This function can only be used if at least one property is rendered"
					);
				}

				return keyEl.getBoundingClientRect().width;
			};

			const isInNote = resizerEl.matches(
				".markdown-source-view &, .markdown-reading-view &"
			);
			const labelCssProperty = isInNote
				? "--better-properties--note-metadata-label-width"
				: "--better-properties--properties-view-metadata-label-width";
			const labelWidthSetting = (
				isInNote ? "notePropertyLabelWidth" : "propertiesViewPropertyLabelWidth"
			) satisfies keyof BetterPropertiesSettings;

			const saveWidth = async (width: string) => {
				document.body.setCssProps({
					[labelCssProperty]: width,
				});
				await this.plugin.updateSettings((prev) => ({
					...prev,
					[labelWidthSetting]: width,
				}));
			};

			resizerEl.addEventListener("dblclick", async () => {
				await saveWidth("");
			});

			resizerEl.addEventListener("dragstart", (e) => {
				if (!e.dataTransfer) return;
				e.dataTransfer.setDragImage(new Image(), e.pageX, e.pageY);
				resizerEl.classList.add("better-properties--is-dragging");

				initialX = e.pageX;
				initialWidth = getLabelWidth();
				maxWidth = metadataEditor.propertyListEl.getBoundingClientRect().width;
				newWidth = 0;
			});

			const onDrag = debounce(
				(e: DragEvent) => {
					const diffX = e.pageX - initialX;
					newWidth = clampNumber(initialWidth + diffX, 0, maxWidth);
					metadataEditor.containerEl.setCssProps({
						"--metadata-label-width": `${newWidth}px`,
					});
				},
				5,
				false
			);

			resizerEl.addEventListener("drag", (e) => {
				// drag event seems to fire on drag end as well, but all of the following are set to 0 when that happens
				if (
					e.clientX === 0 &&
					e.clientY === 0 &&
					e.pageX === 0 &&
					e.pageY === 0 &&
					e.screenX === 0 &&
					e.screenY === 0 &&
					e.x === 0 &&
					e.y == 0
				) {
					return;
				}

				onDrag(e);
			});

			resizerEl.addEventListener("dragend", async () => {
				resizerEl.classList.remove("better-properties--is-dragging");
				metadataEditor.containerEl.setCssProps({
					"--metadata-label-width": "",
				});
				await saveWidth(newWidth + "px");
			});
		};

		const uninstaller = around(proto, {
			load: (old) =>
				dedupe(monkeyAroundKey, old, function () {
					// @ts-expect-error
					const that = this as PatchedMetadataEditor;

					old.call(that);
					createResizer(that);
				}),
			synchronize: (old) =>
				dedupe(monkeyAroundKey, old, function (data) {
					// @ts-expect-error
					const that = this as PatchedMetadataEditor;

					old.call(that, data);
					createResizer(that);
				}),
		});

		this.register(uninstaller);
	}

	patchMenu(): void {
		const manager = this;

		const uninstaller = around(Menu.prototype, {
			showAtMouseEvent(old) {
				return dedupe(monkeyAroundKey, old, function (e) {
					// @ts-expect-error
					const that = this as Menu;

					const exit = () => {
						return old.call(that, e);
					};
					const { currentTarget } = e;
					const isMetadataPropertyIcon =
						currentTarget instanceof HTMLElement &&
						currentTarget.tagName.toLowerCase() === "span" &&
						currentTarget.classList.contains("metadata-property-icon");

					if (!isMetadataPropertyIcon) return exit();

					const container = currentTarget.closest(
						"div.metadata-property[data-property-key]"
					)!;
					const property = container.getAttribute("data-property-key") ?? "";

					manager.modifyPropertyEditorMenu(that, property);

					return exit();
				});
			},
		});

		this.register(uninstaller);
	}

	modifyPropertyEditorMenu(menu: Menu, property: string): void {
		const changeTypeItem = menu.items[0];
		if (changeTypeItem instanceof MenuItem) {
			changeTypeItem.setSection("action.changeType");
		}

		const section = "action.z_better-properties";
		menu
			.addItem((item) => {
				item
					.setSection(section)
					.setIcon("lucide-settings")
					.setTitle("Settings")
					.onClick(() => {
						this.plugin.propertyTypeManager.openPropertySettingsModal(property);
					});
			})
			.addItem((item) => {
				item
					.setSection(section)
					.setIcon("lucide-edit-2")
					.setTitle("Rename")
					.onClick(() => {
						const { name } =
							this.plugin.app.metadataTypeManager.getPropertyInfo(property);
						this.plugin.propertyTypeManager.openRenamePropertyModal(name);
					});
			});

		menu.addSections([section]);
		menu.sections = menu.sections.toSorted((a, b) => a.localeCompare(b));
	}
}

const resolveMetadataEditorPrototype = (plugin: BetterProperties) => {
	const { viewRegistry } = plugin.app;
	// @ts-expect-error constructor is not typed correctly
	const leaf = new WorkspaceLeaf(plugin.app);
	const view = viewRegistry.viewByType["markdown"](leaf);
	const metadataEditorPrototype = Object.getPrototypeOf(
		view.metadataEditor
	) as MetadataEditor;
	leaf.detach();
	return metadataEditorPrototype;
};
