import { displayTooltip, Menu, setIcon, stringifyYaml, TFile } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	findKeyValueByDotNotation,
	flashElement,
	PropertyValueComponent,
	triggerPropertyTypeChange,
	updateNestedObject,
} from "../utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { obsidianText } from "~/i18next/obsidian";
import { ConfirmationModal } from "~/Classes/ConfirmationModal";
import { PropertyWidget } from "obsidian-typings";
import { arrayMove } from "~/lib/utils";

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	// const settings = getPropertyTypeSettings({
	// 	plugin,
	// 	property: ctx.key,
	// 	type: "toggle",
	// });

	const value = (
		typeof initialValue === "object" &&
		!Array.isArray(initialValue) &&
		initialValue !== null
			? initialValue
			: {}
	) as Record<string, unknown>;

	const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
	if (!file) {
		throw new Error("File not found by path: " + ctx.sourcePath);
	}

	const propertyEl = el;

	// const collapseIndicator = propertyEl.parentElement
	// 	?.querySelector(".metadata-property-key")
	// 	?.createDiv({
	// 		cls: "better-properties-properties-group-collapse-indicator",
	// 	});
	// if (collapseIndicator) {
	// 	setIcon(collapseIndicator, "lucide-chevron-down" satisfies Icon);
	// }

	const container = propertyEl.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-group metadata-container",
	});
	const propertiesEl = container.createDiv({
		cls: "better-properties-property-group-properties",
	});
	const addPropertyEl = container.createDiv({
		cls: "better-properties-property-group-add-property metadata-add-button text-icon-button",
	});
	setIcon(
		addPropertyEl.createSpan({ cls: "text-button-icon" }),
		"lucide-plus" satisfies Icon
	);
	addPropertyEl.createSpan({ cls: "text-button-label", text: "Add property" });
	addPropertyEl.addEventListener("click", () => {
		renderSubProperty({
			itemKey: "",
			itemValue: null,
			parentKey: ctx.key,
			parentValue: { ...value },
			parentOnChange: (v) => ctx.onChange(v),
			file,
			plugin,
			propertiesEl,
		});
	});

	for (const [itemKey, itemValue] of Object.entries(value)) {
		renderSubProperty({
			itemKey,
			itemValue,
			parentKey: ctx.key,
			parentValue: { ...value },
			parentOnChange: (v) => ctx.onChange(v),
			file,
			plugin,
			propertiesEl,
		});
	}

	return new PropertyValueComponent(
		container,
		() => {
			// toggle.setValue(!!v);
		},
		() => {
			// toggle.toggleEl.focus();
		}
	);
};

const renderSubProperty = ({
	itemKey,
	itemValue,
	parentKey,
	parentValue,
	parentOnChange,
	file,
	plugin,
	propertiesEl,
}: {
	itemKey: string;
	itemValue: unknown;
	parentKey: string;
	parentValue: Record<string, unknown>;
	parentOnChange: (newParentValue: Record<string, unknown>) => void;
	file: TFile;
	plugin: BetterProperties;
	propertiesEl: HTMLElement;
}) => {
	const itemKeyWithDots = parentKey + "." + itemKey;
	const widget = plugin.app.metadataTypeManager.getTypeInfo(
		itemKeyWithDots,
		itemValue
	);

	const updateParent = (
		cb: (oldParentValue: typeof parentValue) => typeof parentValue
	) => {
		const newParentValue = cb(parentValue);
		parentOnChange(newParentValue);
		triggerPropertyTypeChange(plugin.app.metadataTypeManager, itemKeyWithDots);
	};

	const remove = async () => {
		updateParent((prev) => updateNestedObject(prev, itemKey, undefined));
	};

	const copy = async () => {
		await navigator.clipboard.writeText(
			stringifyYaml({ [itemKey]: itemValue })
		);
	};

	const propertyEl = propertiesEl.createDiv({
		cls: "metadata-property",
		attr: {
			"tabindex": "0",
			"data-property-key": itemKeyWithDots,
		},
	});
	const keyEl = propertyEl.createDiv({ cls: "metadata-property-key" });

	const iconEl = keyEl.createSpan({ cls: "metadata-property-icon" });
	setIcon(iconEl, widget.expected.icon);
	iconEl.addEventListener("click", (e) => {
		new Menu()
			.addItem((item) => {
				item
					.setSection("action")
					.setTitle(obsidianText("properties.option-property-type"))
					.setIcon("lucide-info" satisfies Icon);
				const sub = item.setSubmenu();
				Object.values(
					plugin.app.metadataTypeManager.registeredTypeWidgets
				).forEach((w) => {
					if (w.reservedKeys) return;
					sub.addItem((subItem) => {
						subItem.setIcon(w.icon);
						subItem.setTitle(w.name());
						subItem.onClick(() => {
							plugin.app.metadataTypeManager.setType(itemKeyWithDots, w.type);
							triggerPropertyTypeChange(
								plugin.app.metadataTypeManager,
								itemKeyWithDots
							);
						});
						if (widget.expected.type !== w.type) return;
						subItem.setChecked(true);
					});
				});
			})
			.addItem((item) =>
				item
					.setSection("clipboard")
					.setIcon("lucide-scissors" satisfies Icon)
					.setTitle(obsidianText("interface.menu.cut"))
					.onClick(async () => {
						await copy();
						await remove();
					})
			)
			.addItem((item) =>
				item
					.setSection("clipboard")
					.setIcon("lucide-copy" satisfies Icon)
					.setTitle(obsidianText("interface.menu.copy"))
					.onClick(async () => {
						await copy();
					})
			)
			.addItem((item) =>
				item
					.setSection("clipboard")
					.setIcon("lucide-clipboard-check" satisfies Icon)
					.setTitle(obsidianText("interface.menu.paste"))
			)
			.addItem((item) =>
				item
					.setSection("danger")
					.setWarning(true)
					.setIcon("lucide-trash-2" satisfies Icon)
					.setTitle(obsidianText("interface.menu.remove"))
					.onClick(async () => {
						await remove();
					})
			)
			.showAtMouseEvent(e);
	});

	iconEl.addEventListener("mousedown", () => {
		const dragGhostHiddenClass = "drag-ghost-hidden";
		const dragGhostEl = createDiv({ cls: "drag-reorder-ghost" });

		let isSetupDone = false;

		const { width, height, left, top } = propertyEl.getBoundingClientRect();
		let otherPropertyElsPositions: {
			top: number;
			bottom: number;
			el: Element;
		}[] = [];
		let originalIndex = -1;
		let currentIndex = -1;
		const onMouseMove = (e: MouseEvent) => {
			if (!isSetupDone) {
				const propertyElClone = propertyEl.cloneNode(true);
				propertyEl.classList.add(dragGhostHiddenClass);
				if (!(propertyElClone instanceof HTMLElement)) {
					throw new Error("Cloned property element is not an HTMLElement");
				}
				propertyElClone.style.width = width + "px";
				propertyElClone.style.height = height + "px";
				dragGhostEl.appendChild(propertyElClone);
				window.activeDocument.body.appendChild(dragGhostEl);
				window.activeDocument.body.classList.add("is-grabbing");
				isSetupDone = true;
				// TODO this centers cursor over icon, but native properties drag from the exact point the mouse went down
				dragGhostEl.style.left = `calc(${left}px - var(--icon-size))`;
				dragGhostEl.style.top = `calc(${top}px - var(--icon-size))`;

				propertiesEl
					.querySelectorAll("& > .metadata-property")
					?.forEach((el, i) => {
						if (el === propertyEl) {
							originalIndex = i;
							currentIndex = i;
						}
						const { top, bottom } = el.getBoundingClientRect();
						otherPropertyElsPositions.push({ top, bottom, el });
					});
			}
			dragGhostEl.style.transform = `translate(${e.pageX - left}px, ${
				e.pageY - top
			}px)`;

			otherPropertyElsPositions.forEach(({ top, bottom, el }, i) => {
				const middle = (top + bottom) / 2;
				const shouldSwapUp = i < currentIndex && e.pageY < middle;
				const shouldSwapDown = i > currentIndex && e.pageY > middle;
				if (!shouldSwapUp && !shouldSwapDown) return;
				el.insertAdjacentElement(
					shouldSwapUp ? "beforebegin" : "afterend",
					propertyEl
				);
				otherPropertyElsPositions = arrayMove(
					otherPropertyElsPositions,
					currentIndex,
					i
				);
				currentIndex = i;
			});
		};
		const onMouseUp = () => {
			dragGhostEl.remove();
			propertyEl.classList.remove(dragGhostHiddenClass);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			window.activeDocument.body.classList.remove("is-grabbing");

			if (originalIndex === -1 || currentIndex === -1) return;
			updateParent((prev) => {
				const entries = Object.entries(prev);
				const indexMoved = arrayMove(entries, originalIndex, currentIndex);
				return Object.fromEntries(indexMoved);
			});
		};
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	});

	const keyInputEl = keyEl.createEl("input", {
		cls: "metadata-property-key-input",
		type: "text",
		attr: {
			"autocapitalize": "none",
			"enterkeyhint": "next",
			"aria-label": itemKey,
		},
	});

	keyInputEl.value = itemKey;
	if (itemKey === "") {
		keyInputEl.focus();
	}
	const updateItemKey = async (e: Event) => {
		const newItemKey = (e.target as EventTarget & HTMLInputElement).value;
		if (newItemKey === itemKey) return;
		const newItemKeyWithDots = parentKey + "." + newItemKey;
		const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const found = findKeyValueByDotNotation(newItemKeyWithDots, fm);
		if (!found.key) {
			updateParent((prev) => {
				if (itemKey !== "") {
					updateNestedObject(prev, itemKey, undefined);
				}
				return updateNestedObject(prev, newItemKey, itemValue);
			});
			return;
		}

		const highestMetadataContainer = propertiesEl.closest(
			".metadata-container:not(.better-properties-mod-group)"
		);
		const matchingKeyPropertyEl: HTMLElement | null | undefined =
			highestMetadataContainer?.querySelector(
				`.metadata-property[data-property-key="${newItemKeyWithDots}" i]`
			);
		if (matchingKeyPropertyEl) {
			flashElement(matchingKeyPropertyEl);
		}

		if (keyInputEl.isActiveElement()) {
			displayTooltip(
				keyInputEl,
				obsidianText("properties.msg-duplicate-property-name"),
				{
					classes: ["mod-error"],
				}
			);
			return;
		}
		if (itemKey === "") {
			propertyEl.remove();
			return;
		}
		keyInputEl.value = itemKey;

		return;
	};
	keyInputEl.addEventListener("blur", async (e) => {
		if ((e.target as EventTarget & HTMLInputElement).value === "") {
			propertyEl.remove();
			return;
		}
		await updateItemKey(e);
	});
	keyInputEl.addEventListener("keydown", async (e) => {
		if (e.key !== "Enter") return;
		await updateItemKey(e);
	});

	const valueEl = propertyEl.createDiv({ cls: "metadata-property-value" });

	const renderWidget = (widget: PropertyWidget) => {
		valueEl.empty();
		return widget.render(valueEl, itemValue, {
			app: plugin.app,
			blur: () => {},
			key: itemKeyWithDots,
			onChange: async (value: unknown) => {
				await plugin.app.fileManager.processFrontMatter(file, (fm) => {
					updateNestedObject(fm, itemKeyWithDots, value);
				});
			},
			sourcePath: file.path,
		});
	};

	renderWidget(widget.inferred);

	const mismatchTypeEl = propertyEl.createDiv({
		cls: "clickable-icon metadata-property-warning-icon",
		attr: {
			"aria-label": `Type mismatch, expected ${widget.inferred.name()}`,
			"style": "display: none;",
		},
	});
	setIcon(mismatchTypeEl, "lucide-alert-triangle" satisfies Icon);
	if (widget.expected.type !== widget.inferred.type) {
		mismatchTypeEl.style.removeProperty("display");
	}
	mismatchTypeEl.addEventListener("click", () => {
		const modal = new ConfirmationModal(plugin.app);
		modal.setTitle(
			obsidianText("properties.label-change-property-type", {
				type: widget.expected.type,
			})
		);
		modal.setContent(
			obsidianText("properties.label-change-property-type-desc", {
				oldType: widget.inferred.type,
			})
		);
		modal.addFooterButton((btn) =>
			btn
				.setButtonText(obsidianText("dialogue.button-update"))
				.setCta()
				.onClick(() => {
					modal.close();
					renderWidget(widget.expected);
				})
		);
		modal.addFooterButton((btn) =>
			btn.setButtonText(obsidianText("dialogue.button-cancel")).onClick(() => {
				modal.close();
			})
		);
		modal.open();
	});
};
