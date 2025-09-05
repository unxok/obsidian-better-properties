import { displayTooltip, Menu, setIcon, stringifyYaml } from "obsidian";
import { CustomPropertyType, CustomTypeKey } from "../types";
import {
	flashElement,
	getPropertyTypeSettings,
	PropertyWidgetComponent,
	setPropertyTypeSettings,
	triggerPropertyTypeChange,
	updateNestedObject,
} from "../utils";
import { Icon } from "~/lib/types/icons";
import BetterProperties from "~/main";
import { obsidianText } from "~/i18next/obsidian";
import { ConfirmationModal } from "~/Classes/ConfirmationModal";
import { PropertyWidget } from "obsidian-typings";
import { arrayMove } from "~/lib/utils";

export const typeKey = "group" satisfies CustomTypeKey;

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value: initialValue,
}) => {
	const settings = getPropertyTypeSettings({
		plugin,
		property: ctx.key,
		type: typeKey,
	});

	const value = (
		typeof initialValue === "object" &&
		!Array.isArray(initialValue) &&
		initialValue !== null
			? initialValue
			: {}
	) as Record<string, unknown>;

	const propertyEl = el;

	const collapseCls = "better-properties-properties-group-collapse-indicator";
	const keyEl = propertyEl.parentElement?.querySelector(
		".metadata-property-key"
	);

	const existingCollapseIndicator: HTMLElement | undefined | null =
		keyEl?.querySelector(`& > .${collapseCls}`);

	existingCollapseIndicator?.remove();

	const collapseIndicator = keyEl?.createDiv({
		cls: collapseCls,
	});
	if (collapseIndicator) {
		setIcon(collapseIndicator, "lucide-chevron-down" satisfies Icon);

		const setAttr = (isCollapsed: boolean) => {
			const attr = "data-better-properties-is-collapsed";
			isCollapsed
				? collapseIndicator.setAttribute(attr, "true")
				: collapseIndicator.removeAttribute(attr);
		};

		setAttr(!!settings.collapsed);

		collapseIndicator.addEventListener("click", async () => {
			settings.collapsed = !settings.collapsed;
			setAttr(settings.collapsed);
			setPropertyTypeSettings({
				plugin,
				property: ctx.key,
				type: typeKey,
				typeSettings: {
					...settings,
				},
			});
		});
	}

	const container = propertyEl.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-group metadata-container",
	});
	const propertiesEl = container.createDiv({
		cls: "better-properties-property-group-properties",
	});

	if (!settings.hideAddButton) {
		const addPropertyEl = container.createDiv({
			cls: "better-properties-property-group-add-property metadata-add-button text-icon-button",
		});
		setIcon(
			addPropertyEl.createSpan({ cls: "text-button-icon" }),
			"lucide-plus" satisfies Icon
		);
		addPropertyEl.createSpan({
			cls: "text-button-label",
			text: obsidianText("properties.label-add-property-button"),
		});
		addPropertyEl.addEventListener("click", () => {
			renderSubProperty({
				itemKey: "",
				itemValue: null,
				parentKey: ctx.key,
				parentValue: { ...value },
				parentOnChange: (v) => ctx.onChange(v),
				plugin,
				propertiesEl,
				sourcePath: ctx.sourcePath,
			});
		});
	}

	for (const [itemKey, itemValue] of Object.entries(value)) {
		renderSubProperty({
			itemKey,
			itemValue,
			parentKey: ctx.key,
			parentValue: { ...value },
			parentOnChange: (v) => ctx.onChange(v),
			plugin,
			propertiesEl,
			sourcePath: ctx.sourcePath,
		});
	}

	return new PropertyWidgetComponent(
		"group",
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
	plugin,
	propertiesEl,
	sourcePath,
}: {
	itemKey: string;
	itemValue: unknown;
	parentKey: string;
	parentValue: Record<string, unknown>;
	parentOnChange: (newParentValue: Record<string, unknown>) => void;
	plugin: BetterProperties;
	propertiesEl: HTMLElement;
	sourcePath: string | undefined;
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
				item.setSubmenu();
				// sub items are added elsewhere in src2/MetadataEditor
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

	iconEl.addEventListener("mousedown", (mousedownEvent) => {
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

		const dragThreshold = 25;
		let hasDragged = false;

		const onMouseMove = (mousemoveEvent: MouseEvent) => {
			if (!hasDragged) {
				hasDragged =
					Math.abs(mousedownEvent.pageX - mousemoveEvent.pageX) >
						dragThreshold ||
					Math.abs(mousedownEvent.pageY - mousemoveEvent.pageY) > dragThreshold;
			}
			if (!hasDragged) return;
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
			dragGhostEl.style.transform = `translate(${
				mousemoveEvent.pageX - left
			}px, ${mousemoveEvent.pageY - top}px)`;

			otherPropertyElsPositions.forEach(({ top, bottom, el }, i) => {
				const middle = (top + bottom) / 2;
				const shouldSwapUp = i < currentIndex && mousemoveEvent.pageY < middle;
				const shouldSwapDown =
					i > currentIndex && mousemoveEvent.pageY > middle;
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

		const newItemKeyAlreadyExists = Object.keys(parentValue).some(
			(k) => k.toLowerCase() === newItemKey.toLowerCase()
		);

		console.log(itemKey, newItemKey);

		if (!newItemKeyAlreadyExists) {
			const newParentValue =
				itemKey === ""
					? // this is a new item, so add it
					  { ...parentValue, [newItemKey]: null }
					: // this is an existing item
					  Object.entries(parentValue).reduce((acc, [key, value]) => {
							// key doesn't match, so add back to obj
							if (key.toLowerCase() !== itemKey.toLowerCase()) {
								acc[key] = value;
								return acc;
							}
							// remove property by skipping
							if (newItemKey === "") return acc;
							// add back with different key to rename it
							acc[newItemKey] = value;
							return acc;
					  }, {} as Record<string, unknown>);
			parentOnChange(newParentValue);
			plugin.app.metadataTypeManager.trigger(
				"changed",
				parentKey.toLowerCase()
			);
			return;
		}

		// new key already exists

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
		// if ((e.target as EventTarget & HTMLInputElement).value === "") {
		// 	propertyEl.remove();
		// 	return;
		// }
		await updateItemKey(e);
	});
	keyInputEl.addEventListener("keydown", async (e) => {
		if (e.key !== "Enter") return;

		// TODO this causes a DOM exception. Nothing breaks really, so it's fine for now
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
				const newParentValue = { ...parentValue };
				newParentValue[itemKey] = value;
				parentOnChange(newParentValue);
			},
			// TODO open PR to obsidian typings - sourcePath can be undefined, like when rendered in a base
			sourcePath: sourcePath ?? "",
		});
	};

	renderWidget(widget.inferred);

	const mismatchTypeEl = propertyEl.createDiv({
		cls: "clickable-icon metadata-property-warning-icon",
		attr: {
			"aria-label": obsidianText("properties.label-type-mismatch-warning", {
				type: widget.expected.name(),
			}),
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
