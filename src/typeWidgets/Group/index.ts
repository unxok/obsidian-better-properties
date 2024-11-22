import {
	Menu,
	ProgressBarComponent,
	setIcon,
	Setting,
	stringifyYaml,
	TextComponent,
} from "obsidian";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { PropertyEntryData } from "obsidian-typings";
import { obsidianText } from "@/i18Next/defaultObsidian";
import { tryParseYaml } from "@/libs/utils/obsidian";
import { createDragHandle } from "@/libs/utils/drag";
import { arrayMove } from "@/libs/utils/pure";
import {
	NestedPropertySuggest,
	PropertySuggest,
} from "@/classes/PropertySuggest";

// TODO Allow selecting nested properties to do clipboard actions like obsidian allows

export const GroupWidget: CustomTypeWidget = {
	type: "group",
	icon: "braces",
	default: () => ({}),
	name: () => text("typeWidgets.group.name"),
	validate: (v) => typeof v === "object",
	render: (plugin, el, data, ctx) => {
		const { headerText, showIndentationLines, showAddButton } = plugin.settings
			.propertySettings[data.key.toLowerCase()]?.["group"] ?? {
			...defaultPropertySettings["group"],
		};

		el.style.setProperty("--metadata-input-background-active", "transparent");

		const container = el.createDiv({
			cls: "better-properties-group-container",
		});
		const { value: initialValue } = data;

		let valueObj: Record<string, unknown> = {};

		if (
			initialValue &&
			typeof initialValue === "object" &&
			!Array.isArray(initialValue)
		) {
			valueObj = { ...initialValue };
		}

		const keys = Object.keys(valueObj);

		if (headerText) {
			container.createDiv({ cls: "better-properties-cm-indent" });

			container
				.createDiv({
					cls: "metadata-properties-heading",
				})
				.createDiv({ cls: "metadata-properties-title", text: headerText });
		}

		const contentDiv = container.createDiv({
			cls: "metadata-content",
		});

		const propertiesDiv = contentDiv.createDiv({
			cls: "metadata-properties better-properties-metadata-properties",
		});

		const generateNestedProp = (
			key: string,
			index: number,
			focus?: boolean
		) => {
			const val = valueObj[key];

			const copyClipboard = async () => {
				const obj = {
					[key]: val,
				};
				const yaml = stringifyYaml(obj);
				await navigator.clipboard.writeText(yaml);
			};

			const dotKey = data.key + "." + key;
			// const assignedType =
			// 	plugin.app.metadataTypeManager.getAssignedType(dotKey);

			// TODO obsidian-typings has this typed badly. Opened a PR to fix it 2024-11-13
			const assignedType: string =
				plugin.app.metadataTypeManager.types[dotKey.toLowerCase()]?.type;

			const type = assignedType ?? "text";

			const widget = plugin.app.metadataTypeManager.registeredTypeWidgets[type];

			const wrapper = propertiesDiv.createDiv({
				cls: "better-properties-metadata-property-wrapper",
			});

			wrapper.createSpan({
				cls:
					"better-properties-cm-indent" +
					(showIndentationLines ? " cm-indent" : ""),
			});
			const propertyDiv = wrapper.createDiv({
				cls: "metadata-property",
				attr: {
					"tabindex": "0",
					"data-property-key": dotKey,
					"data-property-type": type,
				},
			});

			const keyDiv = propertyDiv.createDiv({ cls: "metadata-property-key" });
			const iconSpan = keyDiv.createSpan({
				cls: "metadata-property-icon",
				attr: { "aria-disabled": "false" },
			});
			iconSpan.addEventListener("click", (e) => {
				new Menu()
					.addItem((item) => {
						const sub = item
							.setTitle(obsidianText("properties.option-property-type"))
							.setSection("property-type")
							.setSubmenu();
						Object.entries(
							plugin.app.metadataTypeManager.registeredTypeWidgets
						).forEach(([widgetKey, widgetVal]) => {
							if (
								widgetKey === "aliases" ||
								widgetKey === "tags" ||
								widgetKey === "cssClasses"
							)
								return;
							sub.addItem((item) =>
								item
									.setTitle(widgetVal.name())
									.setIcon(widgetVal.icon)
									.onClick(
										async () =>
											await plugin.app.metadataTypeManager.setType(
												dotKey,
												widgetVal.type
											)
									)
							);
						});
					})
					.addItem((item) =>
						item
							.setSection("clipboard")
							.setTitle(obsidianText("interface.menu.cut"))
							.setIcon("scissors")
							.onClick(async () => {
								await copyClipboard();
								delete valueObj[key];
								ctx.onChange({ ...valueObj });
								plugin.refreshPropertyEditor(dotKey);
							})
					)
					.addItem((item) =>
						item
							.setSection("clipboard")
							.setTitle(obsidianText("interface.menu.copy"))
							.setIcon("copy")
							.onClick(async () => {
								await copyClipboard();
							})
					)
					.addItem((item) =>
						item
							.setSection("clipboard")
							.setTitle(obsidianText("interface.menu.paste"))
							.setIcon("clipboard-check")
							.onClick(async () => {
								const readStr = await navigator.clipboard.readText();
								const parsed = tryParseYaml(readStr);
								if (!parsed.success) return;
								const { data } = parsed;
								if (!data || typeof data !== "object" || Array.isArray(data))
									return;
								Object.entries(data).forEach(([dKey, dValue]) => {
									valueObj[dKey] = dValue;
								});
								ctx.onChange({ ...valueObj });
								plugin.refreshPropertyEditor(dotKey);
							})
					)
					.addItem((item) =>
						item
							.setSection("danger")
							.setWarning(true)
							.setTitle(obsidianText("interface.menu.remove"))
							.setIcon("trash")
							.onClick(() => {
								delete valueObj[key];
								ctx.onChange({ ...valueObj });
								plugin.refreshPropertyEditor(dotKey);
							})
					)
					.showAtMouseEvent(e);
			});
			const typeIcon = widget.icon;
			setIcon(iconSpan, typeIcon);
			createDragHandle({
				containerEl: wrapper,
				index,
				items: keys,
				itemsContainerEl: propertiesDiv,
				onDragEnd: (items, from, to) => {
					const newKeys = arrayMove(items, from, to);
					const newValueObj: Record<string, unknown> = {};
					for (const k of newKeys) {
						newValueObj[k] = valueObj[k];
					}
					ctx.onChange(newValueObj);
				},
				dragStyle: "swap",
				handleEl: iconSpan,
			});

			const keyInputCmp = new TextComponent(keyDiv)
				.setValue(key)
				.then((cmp) => {
					cmp.inputEl.classList.add("metadata-property-key-input");
					cmp.inputEl.type = "text";
					cmp.inputEl.setAttribute("autocapitalize", "none");
					cmp.inputEl.setAttribute("enterkeyhint", "next");
					cmp.inputEl.setAttr("aria-label", key);
				});

			const suggester = new NestedPropertySuggest(
				data.key,
				plugin.app,
				keyInputCmp
			);

			suggester.selectSuggestion = function (value) {
				updateKey(value.property);
				this.close();
			};

			const keyInput = keyInputCmp.inputEl;

			if (focus) {
				keyInput.focus();
			}

			const updateKey = (e: Event | string) => {
				const ev = e as MouseEvent & { target: HTMLInputElement };
				const newKey = typeof e === "string" ? e : ev.target.value;
				const obj = { ...valueObj };
				if (!newKey) {
					delete obj[key];
					ctx.onChange(obj);
					return;
				}
				if (newKey === key) return;
				const lower = newKey.toLowerCase();
				if (keys.some((k) => k.toLowerCase() === lower)) {
					keyInput.value = key;
					new Notice(text("typeWidgets.group.propertyAlreadyExists"));
					return;
				}
				delete obj[key];
				obj[newKey] = val ?? "";
				ctx.onChange(obj);
			};

			keyInput.addEventListener("blur", updateKey);
			keyInput.addEventListener("keydown", (e) => {
				if (e.key !== "Enter") return;
				updateKey(e);
			});

			const valueDiv = propertyDiv.createDiv({
				cls: "metadata-property-value",
			});

			widget.render(
				valueDiv,
				{
					key: dotKey,
					type,
					value: val,
					dotKey,
				} as PropertyEntryData<unknown>,
				{
					...ctx,
					onChange: (v) => {
						valueObj[key] = v;
						ctx.onChange({ ...valueObj });
					},
				}
			);
		};

		// TODO it seems the metadataType change which triggers this entire widget to re-render, doesn't actually update the types in the MetadataTypeManager prior to
		// the widget re-rendering, thus we have to do this timeout to wait for that to be updated because otherwise the type for the nested property is undefined
		// There's got to be a better way than doing this though
		window.setTimeout(() => {
			keys.forEach((k, i) => {
				generateNestedProp(k, i);
			});

			contentDiv.createSpan({ cls: "better-properties-cm-indent" });

			if (!showAddButton) return;

			const addButtonDiv = contentDiv.createDiv({
				cls: "metadata-add-button text-icon-button better-properties-metadata-add-button",
				attr: {
					tabindex: "0",
				},
			});

			setIcon(addButtonDiv.createSpan({ cls: "text-button-icon" }), "plus");
			addButtonDiv.createSpan({
				cls: "text-button-label",
				text: obsidianText("properties.label-add-property-button"),
			});

			addButtonDiv.addEventListener("click", () =>
				generateNestedProp("", keys.length, true)
			);
		}, 0);
	},
};

export const createGroupSettings = (
	el: HTMLElement,
	form: PropertySettings["group"],
	updateForm: <T extends keyof PropertySettings["group"]>(
		key: T,
		value: PropertySettings["group"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Group", true);

	new Setting(content)
		.setName(text("typeWidgets.group.settings.headerTextSetting.title"))
		.setDesc(text("typeWidgets.group.settings.headerTextSetting.desc"))
		.addText((cmp) =>
			cmp.setValue(form.headerText).onChange((v) => {
				updateForm("headerText", v);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.group.settings.showIndentationLines.title"))
		.setDesc(text("typeWidgets.group.settings.showIndentationLines.desc"))
		.addToggle((cmp) =>
			cmp.setValue(form.showIndentationLines).onChange((v) => {
				updateForm("showIndentationLines", v);
			})
		);

	new Setting(content)
		.setName(text("typeWidgets.group.settings.showAddButton.title"))
		.setDesc(text("typeWidgets.group.settings.showAddButton.desc"))
		.addToggle((cmp) =>
			cmp.setValue(form.showAddButton).onChange((v) => {
				updateForm("showAddButton", v);
			})
		);
};
