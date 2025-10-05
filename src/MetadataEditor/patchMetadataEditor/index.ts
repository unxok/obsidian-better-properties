import { around, dedupe } from "monkey-around";
import { debounce, Menu, setIcon } from "obsidian";
import { MetadataEditor } from "obsidian-typings";
import { monkeyAroundKey } from "~/lib/constants";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
// import { patchMetadataEditorProperty } from "./patchMetadataEditorProperty";
import { text } from "~/i18next";

export const patchMetadataEditor = (plugin: BetterProperties) => {
	const mdePrototype = resolveMetadataEditorPrototype(
		plugin
	) as PatchedMetadataEditor;

	// patchMetadataEditorProperty(plugin, mdePrototype);

	mdePrototype.createMoreButtonEl = function () {
		return createMoreButtonEl(this);
	};

	mdePrototype.toggleShowHidden = function () {
		return toggleShowHidden(this);
	};

	mdePrototype.createLabelWidthResizerEl = function () {
		return createLabelWidthResizerEl(this);
	};

	const removePatch = around(mdePrototype, {
		load(old) {
			return dedupe(monkeyAroundKey, old, function () {
				// @ts-expect-error
				const that = this as PatchedMetadataEditor;
				old.call(that);

				that.createMoreButtonEl();
				that.showHidden = false;
				that.contentEl.setAttribute(
					"data-better-properties-show-hidden",
					"false"
				);
				that.createLabelWidthResizerEl();
			});
		},
		synchronize(old) {
			return dedupe(monkeyAroundKey, old, function (data) {
				// @ts-expect-error
				const that = this as PatchedMetadataEditor;
				old.call(that, data);
				that.createLabelWidthResizerEl();
			});
		},
	});

	plugin.register(removePatch);
};

export interface PatchedMetadataEditor extends MetadataEditor {
	moreButtonEl: HTMLDivElement;
	showHidden: boolean;
	labelWidthResizerEl: HTMLElement;

	createMoreButtonEl(): this;
	toggleShowHidden(): this;
	createLabelWidthResizerEl(): this;
}

export const resolveMetadataEditorPrototype = (plugin: BetterProperties) => {
	if (!plugin.app.workspace.layoutReady)
		throw new Error(
			"resolveMetadataEditorPrototype can only be used when the app.workspace.layoutReady is true"
		);

	const { workspace, viewRegistry } = plugin.app;
	const leaf = workspace.getLeaf("tab");
	const view = viewRegistry.viewByType["markdown"](leaf);
	const metadataEditorPrototype = Object.getPrototypeOf(
		view.metadataEditor
	) as MetadataEditor;
	leaf.detach();
	return metadataEditorPrototype;
};

const createMoreButtonEl = (that: PatchedMetadataEditor) => {
	if (that.moreButtonEl) {
		that.moreButtonEl.remove();
	}
	that.moreButtonEl = createDiv({
		cls: "metadata-add-button text-icon-button",
	});
	setIcon(
		that.moreButtonEl.createSpan({ cls: "text-button-icon" }),
		"lucide-ellipsis" satisfies Icon
	);
	that.moreButtonEl.createSpan({
		cls: "text-button-label",
		text: text("common.more"),
	});

	const sortProperties = (
		sortFn: (
			a: [key: string, value: unknown],
			b: [key: string, value: unknown]
		) => number
	) => {
		const properties = that.serialize();
		const sorted = Object.entries(properties).sort(sortFn);
		const newProperties = sorted.reduce((acc, entry) => {
			const [key, value] = entry;
			acc[key] = value;
			return acc;
		}, {} as Record<string, unknown>);
		that.synchronize(newProperties);
		that.save();
	};

	that.moreButtonEl.addEventListener("click", (e) => {
		const menu = new Menu()
			.addItem((item) =>
				item
					.setTitle(text("metadataEditor.moreButton.showHidden"))
					.setChecked(that.showHidden)
					.onClick(() => that.toggleShowHidden())
					.setIcon("lucide-eye-off" satisfies Icon)
			)
			.addItem((item) =>
				item
					.setTitle(text("metadataEditor.moreButton.sort"))
					.setIcon("lucide-sort-asc" satisfies Icon)
					.setSubmenu()
					.setNoIcon()
					.addItem((subItem) =>
						subItem
							.setTitle(text("common.sort.nameAlphabetical"))
							.onClick(() => {
								sortProperties(([a], [b]) => a.localeCompare(b));
							})
					)
					.addItem((subItem) =>
						subItem
							.setTitle(text("common.sort.nameReverseAlphabetical"))
							.onClick(() => {
								sortProperties(([a], [b]) => b.localeCompare(a));
							})
					)
					.addItem((subItem) =>
						subItem
							.setTitle(text("common.sort.typeAlphabetical"))
							.onClick(() => {
								sortProperties(([a], [b]) => {
									const aType =
										that.app.metadataTypeManager.getAssignedWidget(a) ?? "text";
									const bType =
										that.app.metadataTypeManager.getAssignedWidget(b) ?? "text";
									const { registeredTypeWidgets } =
										that.app.metadataTypeManager;
									const aName = registeredTypeWidgets[aType]?.name() ?? "";
									const bName = registeredTypeWidgets[bType]?.name() ?? "";
									return aName.localeCompare(bName);
								});
							})
					)
					.addItem((subItem) =>
						subItem
							.setTitle(text("common.sort.typeReverseAlphabetical"))
							.onClick(() => {
								sortProperties(([a], [b]) => {
									const aType =
										that.app.metadataTypeManager.getAssignedWidget(a) ?? "text";
									const bType =
										that.app.metadataTypeManager.getAssignedWidget(b) ?? "text";
									const { registeredTypeWidgets } =
										that.app.metadataTypeManager;
									const aName = registeredTypeWidgets[aType]?.name() ?? "";
									const bName = registeredTypeWidgets[bType]?.name() ?? "";
									return bName.localeCompare(aName);
								});
							})
					)
			);

		menu.showAtMouseEvent(e);
	});

	that.addPropertyButtonEl.insertAdjacentElement("afterend", that.moreButtonEl);
	return that;
};

const toggleShowHidden = (that: PatchedMetadataEditor) => {
	const isShowStr =
		that.contentEl.getAttribute("data-better-properties-show-hidden") ??
		"false";
	const isShow = isShowStr.toLowerCase() === "true";
	that.contentEl.setAttribute(
		"data-better-properties-show-hidden",
		(!isShow).toString()
	);
	that.showHidden = !isShow;
	return that;
};

const createLabelWidthResizerEl = (that: PatchedMetadataEditor) => {
	if (that.labelWidthResizerEl) {
		that.labelWidthResizerEl.remove();
	}
	that.labelWidthResizerEl = that.propertyListEl.createDiv({
		cls: "better-properties-label-width-resizer",
	});

	const { app, labelWidthResizerEl, containerEl } = that;

	labelWidthResizerEl.draggable = true;

	let initialX = 0;

	labelWidthResizerEl.addEventListener("dragstart", (e) => {
		labelWidthResizerEl.setAttribute("data-is-dragging", "true");
		initialX = e.pageX;
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.dropEffect = "move";
		e.dataTransfer.setDragImage(createDiv(), 0, 0);
		const overlayEl = createDiv({
			cls: "better-properties-drag-overlay",
			attr: { id: "better-properties-drag-overlay" },
		});

		overlayEl.addEventListener("dragover", (e) => {
			e.preventDefault();
			// e.dataTransfer && (e.dataTransfer.dropEffect = "copy");
		});

		window.setTimeout(() => {
			document.body.appendChild(overlayEl);
		}, 0);
	});

	const getInitialWidth = () =>
		containerEl.querySelector(".metadata-property-key")?.getBoundingClientRect()
			?.width ?? 0;

	let initialWidth: number | undefined = undefined;

	const onDrag = debounce(
		(e: MouseEvent) => {
			const diff = e.pageX - initialX;
			if (initialWidth === undefined) {
				initialWidth = getInitialWidth();
			}
			const newWidth = initialWidth + diff;
			containerEl.style.setProperty("--metadata-label-width", newWidth + "px");
			initialX = e.pageX;
			initialWidth = newWidth;
		},
		5,
		false
	);

	labelWidthResizerEl.addEventListener("drag", onDrag);

	labelWidthResizerEl.addEventListener("dragend", () => {
		labelWidthResizerEl.removeAttribute("data-is-dragging");
		const labelWidth = containerEl
			.querySelector(".metadata-property-key")
			?.getBoundingClientRect()?.width;
		if (labelWidth === undefined) return;
		document.body.style.setProperty(
			"--metadata-label-width",
			labelWidth + "px"
		);

		app.workspace.trigger(
			"better-properties:property-label-width-change",
			labelWidth
		);

		containerEl.style.removeProperty("--metadata-label-width");
		document.getElementById("better-properties-drag-overlay")?.remove();
	});

	labelWidthResizerEl.addEventListener("dblclick", () => {
		document.body.style.removeProperty("--metadata-label-width");
		app.workspace.trigger(
			"better-properties:property-label-width-change",
			undefined
		);
	});

	return that;
};
