import { around, dedupe } from "monkey-around";
import {
	Menu,
	MenuPositionDef,
	Modal,
	PopoverSuggest,
	setIcon,
	WorkspaceLeaf,
} from "obsidian";
import { CanvasView, PropertyWidgetComponentBase } from "obsidian-typings";
import { PropertyComponent } from "~/classes/PropertyComponent";
import { text } from "~/i18next";
import { obsidianText } from "~/i18next/obsidian";
import { monkeyAroundKey } from "~/lib/constants";
import { Icon } from "~/lib/types/icons";
import { syncTryCatch } from "~/lib/utils";
import BetterProperties from "~/main";

const CANVAS_VIEW: string = "canvas";

export const patchCanvas = (plugin: BetterProperties) => {
	const leaves = getLoadedCanvasViewLeaves(plugin);

	if (leaves.length) {
		applyPatch(plugin, leaves[0].view);
		rebuildViews(leaves);
	}

	// have to wait until a Canvas view is opened to apply patch
	const removeViewRegistryPatch = around(plugin.app.viewRegistry.viewByType, {
		[CANVAS_VIEW]: (old) => {
			return dedupe(monkeyAroundKey, old, function (leaf) {
				const view = old(leaf) as CanvasView;
				applyPatch(plugin, view);
				rebuildViews(getLoadedCanvasViewLeaves(plugin));
				removeViewRegistryPatch();
				return view;
			});
		},
	});

	plugin.register(removeViewRegistryPatch);
};

const getLoadedCanvasViewLeaves = (plugin: BetterProperties) => {
	return plugin.app.workspace
		.getLeavesOfType(CANVAS_VIEW)
		.filter((leaf) => !leaf.isDeferred) as (WorkspaceLeaf & {
		view: CanvasView;
	})[];
};

const rebuildViews = (leaves: ReturnType<typeof getLoadedCanvasViewLeaves>) => {
	leaves.forEach((leaf) => leaf.rebuildView());
};

const applyPatch = (plugin: BetterProperties, view: CanvasView) => {
	const CanvasViewPrototype: CanvasView = Object.getPrototypeOf(view);
	const removePatch = around(CanvasViewPrototype, {
		load(old) {
			return dedupe(monkeyAroundKey, old, function () {
				// @ts-expect-error
				const that: CanvasView = this;
				old.call(that);

				const propertiesControlEl = that.canvas.canvasControlsEl
					.createDiv({ cls: "canvas-control-group" })
					.createDiv({
						cls: "canvas-control-item",
						attr: {
							"aria-label": "Canvas properties",
							"data-tooltip-position": "left",
						},
					});

				setIcon(propertiesControlEl, "lucide-archive" satisfies Icon);

				let popover: MetadataEditorPopover | undefined = undefined;

				propertiesControlEl.addEventListener("click", (e) => {
					if (popover) {
						popover.close();
						popover = undefined;
						return;
					}

					popover = new MetadataEditorPopover(plugin, that);
					popover.onClose = () => {
						popover = undefined;
					};

					popover.open();
				});

				propertiesControlEl.addEventListener("contextmenu", (e) => {
					const menu = new Menu();
					menu.addItem((item) =>
						item
							.setTitle("Reset position")
							.setIcon("lucide-rotate-cw" satisfies Icon)
							.onClick(() => {
								if (popover) {
									popover.close();
								}

								popover = new MetadataEditorPopover(plugin, that);
								popover.onClose = () => {
									popover = undefined;
								};

								popover.open();
								popover.applyTranslate({ x: 0, y: 0 });
							})
					);
					menu.showAtMouseEvent(e);
				});
			});
		},
	});

	plugin.register(removePatch);
};

type TranslateOffest = { x: number; y: number };
type Size = { width: number; height: number };

const defaultSize: Size = {
	width: 400,
	height: 200,
};

const BP_CANVAS_VIEW_DATA_KEY = "better-properties";

type BpCanvasdata = {
	metadataEditorOffset: {
		x: number;
		y: number;
	};
	metadataEditorWidth: number;
	metadataEditorHeight: number;
	properties: Record<string, unknown>;
};

const defaultBpCanvasData: BpCanvasdata = {
	metadataEditorOffset: {
		x: 0,
		y: 0,
	},
	metadataEditorWidth: 0,
	metadataEditorHeight: 0,
	properties: {},
};

class MetadataEditorPopover extends Modal {
	isClosing: boolean = false;
	renderedProperties: Set<PropertyWidgetComponentBase> = new Set();

	constructor(public plugin: BetterProperties, public canvasView: CanvasView) {
		super(plugin.app);
	}

	getCanvasViewData(): Record<string, unknown> & {
		[BP_CANVAS_VIEW_DATA_KEY]?: BpCanvasdata;
	} {
		const dataStr = this.canvasView.getViewData();
		const { data } = syncTryCatch(() => {
			return JSON.parse(dataStr);
		});

		return data ?? {};
	}

	getCanvasBpData(): BpCanvasdata {
		const viewData = this.getCanvasViewData();
		const bpData = viewData[BP_CANVAS_VIEW_DATA_KEY];
		if (!bpData) return { ...defaultBpCanvasData };
		return { ...defaultBpCanvasData, ...bpData };
	}

	setCanvasBpData(data: BpCanvasdata): void {
		const oldData = this.getCanvasViewData();
		const newData = { ...oldData, [BP_CANVAS_VIEW_DATA_KEY]: data };
		this.canvasView.setViewData(JSON.stringify(newData), false);
		this.canvasView.requestSave();
	}

	updateCanvasBpData(cb: (data: BpCanvasdata) => BpCanvasdata): void {
		const data = cb(this.getCanvasBpData());
		this.setCanvasBpData(data);
	}

	onOpen(): void {
		this.canvasView.canvas.wrapperEl.insertAdjacentElement(
			"beforeend",
			this.containerEl
		);

		const { metadataEditorOffset, properties } = this.getCanvasBpData();
		this.applyTranslate(metadataEditorOffset);
		this.applySize(this.size);
		this.app.keymap.popScope(this.scope);

		const modalCloseButton: HTMLElement | null = this.modalEl.querySelector(
			"& > .modal-close-button"
		);
		if (modalCloseButton) {
			setIcon(modalCloseButton, "lucide-x" satisfies Icon);
		}

		this.createDragButtonEl();
		this.createResizerEls();
		this.modalEl.classList.add("better-properties-canvas-metadata-editor");
		this.containerEl.classList.add("hover-sidebar-ignore");
		const metadataContainerEl = this.createMetadataContainerEl(this.contentEl);
		this.createMetadataErrorContainerEl(metadataContainerEl);
		const metadataPropertiesHeadingEl =
			this.createMetadataPropertiesHeadingEl(metadataContainerEl);
		const metadataPropertiesHeadingCollapseEl =
			this.createMetadataPropertiesHeadingCollapseEl(
				metadataPropertiesHeadingEl
			);
		this.createMetadataPropertiesHeadingTitleEl(metadataPropertiesHeadingEl);

		const metadataContentEl = this.createMetadataContentEl(metadataContainerEl);

		metadataPropertiesHeadingEl.addEventListener("click", () => {
			const isCollapsed =
				metadataPropertiesHeadingEl.classList.contains("is-collapsed");
			if (isCollapsed) {
				metadataPropertiesHeadingEl.classList.remove("is-collapsed");
				metadataPropertiesHeadingCollapseEl.classList.remove("is-collapsed");
				metadataContentEl.style.removeProperty("display");
				return;
			}

			metadataPropertiesHeadingEl.classList.add("is-collapsed");
			metadataPropertiesHeadingCollapseEl.classList.add("is-collapsed");
			metadataContentEl.style.setProperty("display", "none");
		});

		const metadataPropertiesEl =
			this.createMetadataPropertiesEl(metadataContentEl);
		this.createMetadataAddButtonEl(metadataContentEl);
		this.createMetadataMoreButtonEl(metadataContentEl);

		Object.entries(properties).forEach(([key, value]) => {
			this.createMetadataProperty(metadataPropertiesEl, key, value);
		});
	}

	createDragButtonEl(): HTMLDivElement {
		const dragButtonEl = this.modalEl.createDiv({
			cls: "better-properties-modal-drag-button",
		});
		setIcon(dragButtonEl, "lucide-grip" satisfies Icon);

		dragButtonEl.addEventListener("mousedown", (e) => {
			const startingCoords = {
				x: e.pageX,
				y: e.pageY,
			};
			const onMouseMove = (mouseMoveEvent: MouseEvent) => {
				document.body.classList.add("is-grabbing");

				console.log("diff: ", mouseMoveEvent.clientX - mouseMoveEvent.offsetX);

				const diffCoords = {
					x: mouseMoveEvent.clientX - startingCoords.x,
					y: mouseMoveEvent.clientY - startingCoords.y,
				};

				const newOffset = {
					x: this.translateOffset.x + diffCoords.x,
					y: this.translateOffset.y + diffCoords.y,
				};

				this.applyTranslate(newOffset);

				startingCoords.x = mouseMoveEvent.pageX;
				startingCoords.y = mouseMoveEvent.pageY;
			};
			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				document.body.classList.remove("is-grabbing");
				this.updateCanvasBpData((prev) => ({
					...prev,
					metadataEditorOffset: this.translateOffset,
				}));
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});

		return dragButtonEl;
	}

	createResizerEls(): void {
		type Side = "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l";
		const createResizer = (side: Side) => {
			const resizerEl = this.modalEl.createDiv({
				cls: "better-properties-resizer",
				attr: {
					"data-better-properties-side": side,
				},
			});

			resizerEl.addEventListener("dblclick", () => {
				if (side === "bl" || side === "b" || side === "br") {
					this.applySize({
						width: this.size.width,
						height: -1,
					});
				}

				if (side === "tl" || side === "t" || side === "tr") {
					const offsetY = this.translateOffset.y + this.size.height;
					this.applySize({
						width: this.size.width,
						height: -1,
					});
					this.applyTranslate({
						x: this.translateOffset.x,
						y: offsetY - this.modalEl.getBoundingClientRect().height,
					});
				}

				if (side === "bl" || side === "l" || side === "tl") {
					this.applySize({
						width: -1,
						height: this.size.height,
					});
				}

				if (side === "br" || side === "r" || side === "tr") {
					const offsetX = this.translateOffset.x + this.size.width;
					this.applySize({
						width: -1,
						height: this.size.height,
					});
					this.applyTranslate({
						x: offsetX - this.modalEl.getBoundingClientRect().width,
						y: this.translateOffset.y,
					});
				}
			});

			resizerEl.addEventListener("mousedown", (mouseDownEvent) => {
				const startingCoords = {
					x: mouseDownEvent.pageX,
					y: mouseDownEvent.pageY,
				};
				const onMouseMove = (mouseMoveEvent: MouseEvent) => {
					document.body.setAttribute("data-better-properties-mod-resize", side);

					const diffCoords = {
						x: mouseMoveEvent.clientX - startingCoords.x,
						y: mouseMoveEvent.clientY - startingCoords.y,
					};

					const rect = this.modalEl.getBoundingClientRect();

					if (side === "bl" || side === "b" || side === "br") {
						this.applySize({
							width: this.size.width,
							height: diffCoords.y + rect.height,
						});
					}

					if (side === "tl" || side === "t" || side === "tr") {
						const offsetY = -1 * diffCoords.y;
						const newHeight = offsetY + rect.height;

						this.applySize({
							width: this.size.width,
							height: newHeight,
						});

						if (newHeight === this.modalEl.getBoundingClientRect().height) {
							this.applyTranslate({
								x: this.translateOffset.x,
								y: this.translateOffset.y - offsetY,
							});
						}
					}

					if (side === "br" || side === "r" || side === "tr") {
						this.applySize({
							width: diffCoords.x + rect.width,
							height: this.size.height,
						});
					}

					if (side === "bl" || side === "l" || side === "tl") {
						const offsetX = -1 * diffCoords.x;
						const newWidth = offsetX + rect.width;

						this.applySize({
							width: newWidth,
							height: this.size.height,
						});

						if (newWidth === this.modalEl.getBoundingClientRect().width) {
							this.applyTranslate({
								x: this.translateOffset.x - offsetX,
								y: this.translateOffset.y,
							});
						}
					}

					startingCoords.x = mouseMoveEvent.pageX;
					startingCoords.y = mouseMoveEvent.pageY;
				};
				const onMouseUp = () => {
					document.removeEventListener("mousemove", onMouseMove);
					document.removeEventListener("mouseup", onMouseUp);
					document.body.removeAttribute("data-better-properties-mod-resize");
					// this.updateCanvasBpData((prev) => ({
					// 	...prev,
					// 	metadataEditorOffset: this.translateOffset,
					// }));
				};

				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", onMouseUp);
			});
		};

		createResizer("tl");
		createResizer("t");
		createResizer("tr");
		createResizer("r");
		createResizer("br");
		createResizer("b");
		createResizer("bl");
		createResizer("l");
	}

	translateOffset: TranslateOffest = { x: 0, y: 0 };

	applyTranslate(offset: { x: number; y: number }): void {
		this.translateOffset = { ...offset };

		this.containerEl.setCssProps({
			"--better-properties-translate-x":
				(offset.x === -1 ? 0 : offset.x) + "px",
			"--better-properties-translate-y":
				(offset.y === -1 ? 0 : offset.y) + "px",
		});
	}

	size: Size = { width: 400, height: 100 };

	applySize(size: Size): void {
		this.size = { ...size };
		this.modalEl.setCssProps({
			"--better-properties-width":
				(size.width === -1 ? defaultSize.width : size.width) + "px",
			"--better-properties-height":
				(size.height === -1 ? defaultSize.height : size.height) + "px",
		});
	}

	createMetadataContainerEl(contentEl: HTMLElement): HTMLDivElement {
		return contentEl.createDiv({
			cls: "metadata-container",
			attr: {
				"tabindex": -1,
				"data-property-count": 0,
			},
		});
	}

	createMetadataErrorContainerEl(
		metadataContainerEl: HTMLDivElement
	): HTMLDivElement {
		const metadataErrorContainerEl = metadataContainerEl.createDiv({
			cls: "metadata-error-container",
		});
		metadataErrorContainerEl.style.setProperty("display", "none");
		return metadataErrorContainerEl;
	}

	createMetadataPropertiesHeadingEl(
		metadataContainerEl: HTMLDivElement
	): HTMLDivElement {
		return metadataContainerEl.createDiv({
			cls: "metadata-properties-heading",
			attr: {
				tabindex: 0,
			},
		});
	}

	createMetadataPropertiesHeadingCollapseEl(
		metadataPropertiesHeadingEl: HTMLDivElement
	): HTMLDivElement {
		const metadataPropertiesHeadingCollapseEl =
			metadataPropertiesHeadingEl.createDiv({
				cls: "collapse-indicator collapse-icon",
			});
		setIcon(metadataPropertiesHeadingCollapseEl, "right-arrow" satisfies Icon);
		return metadataPropertiesHeadingCollapseEl;
	}

	createMetadataPropertiesHeadingTitleEl(
		metadataPropertiesHeadingEl: HTMLDivElement
	): HTMLDivElement {
		return metadataPropertiesHeadingEl.createDiv({
			cls: "metadata-properties-title",
			text: obsidianText("properties.label-heading"),
		});
	}

	createMetadataContentEl(metadataContainerEl: HTMLElement): HTMLDivElement {
		return metadataContainerEl.createDiv({
			cls: "metadata-content",
			attr: {
				"data-better-properties-show-hidden": false,
			},
		});
	}

	createMetadataPropertiesEl(metadataContentEl: HTMLDivElement) {
		return metadataContentEl.createDiv({ cls: "metadata-properties" });
	}

	createMetadataAddButtonEl(metadataContentEl: HTMLDivElement) {
		const metadataAddButtonEl = metadataContentEl.createDiv({
			cls: "metadata-add-button text-icon-button",
			attr: {
				tabindex: 0,
			},
		});
		metadataAddButtonEl.addEventListener("click", () => {
			// TODO add property
		});
		setIcon(
			metadataAddButtonEl.createSpan({ cls: "text-button-icon" }),
			"lucide-plus" satisfies Icon
		);
		metadataAddButtonEl.createSpan({
			cls: "text-button-label",
			text: obsidianText("properties.label-add-property-button"),
		});

		return metadataAddButtonEl;
	}

	createMetadataMoreButtonEl(metadataContentEl: HTMLDivElement) {
		const metadataAddButtonEl = metadataContentEl.createDiv({
			cls: "metadata-add-button text-icon-button",
			attr: {
				tabindex: 0,
			},
		});
		metadataAddButtonEl.addEventListener("click", () => {
			// TODO create more options menu
		});
		setIcon(
			metadataAddButtonEl.createSpan({ cls: "text-button-icon" }),
			"lucide-ellipsis" satisfies Icon
		);
		metadataAddButtonEl.createSpan({
			cls: "text-button-label",
			text: text("common.more"),
		});

		return metadataAddButtonEl;
	}

	createMetadataProperty(
		propertiesEl: HTMLDivElement,
		key: string,
		value: unknown
	): void {
		const propertyComponent = new Property(
			this.plugin,
			propertiesEl,
			key,
			value,
			this.canvasView.file!.path
		);
		const widget = propertyComponent.render();
		this.renderedProperties.add(widget);
	}
}

class Property extends PropertyComponent {}
