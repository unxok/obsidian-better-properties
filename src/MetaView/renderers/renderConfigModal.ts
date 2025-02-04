import { ConfirmationModal } from "@/classes/ConfirmationModal";
import { FolderSuggest } from "@/classes/FolderSuggest";
import { InputSuggest, Suggestion } from "@/classes/InputSuggest";
import { ListComponent } from "@/classes/ListComponent";
import { PropertySuggest } from "@/classes/PropertySuggest";
import { obsidianText } from "@/i18Next/defaultObsidian";
import { createDragHandle } from "@/libs/utils/drag";
import { compareFunc } from "@/libs/utils/obsidian";
import { toNumberNotNaN, arrayMove } from "@/libs/utils/pure";
import BetterProperties from "@/main";
import {
	Setting,
	Modal,
	App,
	TextComponent,
	setTooltip,
	DropdownComponent,
	Menu,
	SearchComponent,
} from "obsidian";
import {
	BlockConfig,
	SaveBlockConfig,
	FileDataField,
	Field,
	fileDataColumnValueOptions,
} from "../shared";

export const openConfigurationModal = ({
	plugin,
	blockConfig,
	saveBlockConfig,
}: {
	plugin: BetterProperties;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
}) => {
	const modal = new ConfirmationModal(plugin.app);
	const form = { ...blockConfig };

	modal.onClose = async () => {
		await saveBlockConfig(form);
	};

	modal.onOpen = () => {
		const { contentEl } = modal;
		contentEl.empty();
		modal.setTitle("MetaView Configuration");

		new Setting(contentEl)
			.setName("Fields")
			.setDesc(
				"The fields of data that will be displayed for each queried note. Only property and embed fields are editable!"
			);
		const fieldsContainer = contentEl.createDiv();
		new FieldListComponent(
			plugin.app,
			fieldsContainer,
			{ type: "fileData", alias: "", value: "" as FileDataField["value"] },
			form.fields
		)
			.renderItems()
			.createNewItemButton()
			.createSortAlphabetical()
			.onChange((arr) => (form.fields = [...arr]));

		new Setting(contentEl)
			.setName("Folder")
			.setDesc(
				"Choose a folder to query notes from. If blank, all folders will be searched. Subfolders are included!"
			)
			.addSearch((cmp) => {
				cmp.setValue(form.folder);
				cmp.onChange((v) => (form.folder = v));
				new FolderSuggest(plugin.app, cmp);
			});

		new Setting(contentEl)
			.setName("Excluded Folders")
			.setDesc(
				"Set specific folders to exclude notes within them from the query. Includes Subfolders!"
			);
		const excludedFoldersContainer = contentEl.createDiv();
		new FolderListComponent(
			plugin.app,
			excludedFoldersContainer,
			"",
			form.excludedFolders
		)
			.renderItems()
			.createNewItemButton()
			.createSortAlphabetical()
			.onChange((arr) => (form.excludedFolders = [...arr]));

		new Setting(contentEl)
			.setName("Page size")
			.setDesc(
				"The number of results to show at a time. Set to 0 for no limit."
			)
			.addText((cmp) =>
				cmp
					.setValue(form.pageSize.toString())
					.onChange((v) => (form.pageSize = toNumberNotNaN(v)))
			);

		modal.createFooterButton((cmp) =>
			cmp.setButtonText("close").onClick(() => modal.close())
		);
		modal.createFooterButton((cmp) =>
			cmp.setButtonText("form data").onClick(() => {
				const m = new Modal(modal.app);
				m.onOpen = () => {
					m.contentEl.empty();
					m.contentEl
						.createEl("pre")
						.createEl("code", { text: JSON.stringify(form, undefined, 2) });
				};
				m.open();
			})
		);
	};

	modal.open();
};

class FieldListComponent extends ListComponent<Field> {
	constructor(
		private app: App,
		containerEl: HTMLElement,
		defaultItemValue: Field,
		items?: Field[]
	) {
		super(containerEl, defaultItemValue, items);
	}

	renderItem(
		fieldValue: Field,
		setting: Setting,
		index: number,
		shouldFocus: boolean
	): void {
		const { app } = this;
		const { controlEl } = setting;
		const { type, value, alias } = fieldValue;
		controlEl.classList.add(
			"better-properties-metaview-configuration-fields-item"
		);
		controlEl.appendChild(
			createDragHandle({
				containerEl: setting.settingEl,
				index,
				items: this.items,
				itemsContainerEl: this.itemsContainerEl,
				onDragEnd: (items, from, to) =>
					this.setValueHighlight(arrayMove(items, from, to), to),
				dragStyle: "indicator",
			})
		);
		const fieldTypeOptions: Record<Field["type"], string> = {
			fileData: "File data",
			property: "Property",
			tags: "Tags",
			embed: "Embed",
		};

		const renderFieldValueText = (fieldType: Field["type"]) => {
			const onChange = (v: string) =>
				this.updateItemValue(
					(oldValue) => ({ ...oldValue, value: v } as Field),
					index
				);
			const cmp = new TextComponent(setting.controlEl)
				.setValue(value)
				.onChange(onChange)
				.then((cmp) => {
					setTooltip(cmp.inputEl, "Field value");
					if (fieldType === "fileData") {
						new FileDataSuggest(app, cmp);
						cmp.setPlaceholder("");
					} else if (fieldType === "property") {
						new PropertySuggest(app, cmp);
						cmp.setPlaceholder("");
					} else if (fieldType === "embed") {
						new EmbedSuggest(app, cmp);
						cmp.setPlaceholder("#Some heading *or* ^some-block-id");
					} else {
						// tags doesn't use value
						cmp.setPlaceholder("").setDisabled(true);
						cmp.inputEl.classList.add("better-properties-mod-disabled");
						setTooltip(
							cmp.inputEl,
							'The "Tags" field doesn\'t use a field value'
						);
					}

					cmp.inputEl.classList.add(
						"better-properties-text-list-component-input"
					);
					if (!shouldFocus) return;
					cmp.inputEl.focus();
				});
			return cmp;
		};

		let fieldValueText: TextComponent;
		new DropdownComponent(controlEl)
			.addOptions(fieldTypeOptions)
			.setValue(type)
			.onChange((v) => {
				const newValue = v as Field["type"];
				this.updateItemValue(
					(oldValue) => ({ ...oldValue, type: newValue } as Field),
					index
				);
				const cmp = renderFieldValueText(newValue);
				cmp.setValue("");
				fieldValueText.inputEl.replaceWith(cmp.inputEl);
				fieldValueText = cmp;
			})
			.then((cmp) => setTooltip(cmp.selectEl, "Field type"));

		fieldValueText = renderFieldValueText(type);

		new TextComponent(controlEl)
			.setValue(alias)
			.onChange((v) =>
				this.updateItemValue((old) => ({ ...old, alias: v }), index)
			)
			.then((cmp) => {
				setTooltip(cmp.inputEl, "Field alias");
			});

		// TODO set up additional options
		// new ExtraButtonComponent(controlEl)
		// 	.setIcon('settings')
		// 	.setTooltip("Additional options")
		// 	.onClick(() => {
		// 		const modal = new Modal(app);
		// 		modal.onOpen = () => {
		// 			const {contentEl} = modal;
		// 			contentEl.empty();
		// 			new Setting(contentEl)
		// 				.setName("")
		// 		}
		// 	})

		// this.addMoveUpButton(setting, index);
		// this.addMoveDownButton(setting, index);
		this.addDeleteButton(setting, index);
	}

	public createSortAlphabetical(): this {
		this.toolbarSetting.addButton((cmp) =>
			cmp
				.setIcon("sort-asc")
				.setClass("clickable-icon")
				.setTooltip(obsidianText("plugins.file-explorer.action-change-sort"))
				.onClick((e) => {
					new Menu()
						.addItem((item) =>
							item
								.setTitle("Field value (A to Z)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(a.value, b.value))
									)
								)
						)
						.addItem((item) =>
							item
								.setTitle("Field value (Z to A)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(b.value, a.value))
									)
								)
						)
						.showAtMouseEvent(e);
				})
		);
		return this;
	}
}

class FolderListComponent extends ListComponent<string> {
	constructor(
		private app: App,
		containerEl: HTMLElement,
		defaultItemValue: string,
		items?: string[]
	) {
		super(containerEl, defaultItemValue, items);
	}

	renderItem(
		value: string,
		setting: Setting,
		index: number,
		shouldFocus: boolean
	): void {
		setting.controlEl.appendChild(
			createDragHandle({
				containerEl: setting.settingEl,
				index,
				items: this.items,
				itemsContainerEl: this.itemsContainerEl,
				onDragEnd: (items, from, to) =>
					this.setValueHighlight(arrayMove(items, from, to), to),
				dragStyle: "indicator",
			})
		);
		new SearchComponent(setting.controlEl)
			.setValue(value)
			.onChange((v) => this.updateItemValue(v, index))
			.then((cmp) => {
				new FolderSuggest(this.app, cmp);
				cmp.inputEl.classList.add(
					"better-properties-text-list-component-input"
				);
				if (!shouldFocus) return;
				cmp.inputEl.focus();
			});
		// this.addMoveUpButton(setting, index);
		// this.addMoveDownButton(setting, index);
		this.addDeleteButton(setting, index);
	}

	public createSortAlphabetical(): this {
		this.toolbarSetting.addButton((cmp) =>
			cmp
				.setIcon("sort-asc")
				.setClass("clickable-icon")
				.setTooltip(obsidianText("plugins.file-explorer.action-change-sort"))
				.onClick((e) => {
					new Menu()
						.addItem((item) =>
							item
								.setTitle("Folder name (A to Z)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(a, b))
									)
								)
						)
						.addItem((item) =>
							item
								.setTitle("Folder name (Z to A)")
								.onClick(() =>
									this.setValue(
										this.items.toSorted((a, b) => compareFunc(b, a))
									)
								)
						)
						.showAtMouseEvent(e);
				})
		);
		return this;
	}
}

class EmbedSuggest extends InputSuggest<{ subpath: string; level?: number }> {
	getHeadings(query: string): { subpath: string; level?: number }[] {
		const lowerQuery = query.toLowerCase();
		const discarded = new Set<string>();
		const included = new Map<string, { subpath: string; level?: number }>();

		Object.values(this.app.metadataCache.metadataCache).forEach((meta) => {
			meta.headings?.forEach(({ heading, level }) => {
				if (discarded.has(heading) || included.has(heading)) return;
				// NOT case sensitive
				if (!heading.toLowerCase().includes(lowerQuery)) {
					discarded.add(heading);
					return;
				}
				included.set(heading, { subpath: heading, level });
			});
		});

		return Array.from(included.values());
	}

	getBlocks(query: string): { subpath: string; level?: number }[] {
		const discarded = new Set<string>();
		const included = new Map<string, { subpath: string; level?: number }>();

		Object.values(this.app.metadataCache.metadataCache).forEach((meta) => {
			if (!meta.blocks) return;
			Object.keys(meta.blocks).forEach((id) => {
				if (discarded.has(id) || included.has(id)) return;
				// IS case sensitive
				if (!id.includes(query)) {
					discarded.add(id);
					return;
				}
				included.set(id, { subpath: id });
			});
		});

		return Array.from(included.values());
	}

	protected getSuggestions(
		query: string
	): { subpath: string; level?: number }[] {
		if (!query) return [];
		const char = query.charAt(0);
		const trueQuery = query.slice(1);
		if (!(char === "#" || char === "^")) return [];
		const arr =
			char === "#" ? this.getHeadings(trueQuery) : this.getBlocks(trueQuery);
		return arr;
	}

	protected parseSuggestion(value: {
		subpath: string;
		level?: number;
	}): Suggestion {
		return {
			title: value.subpath,
			aux: value.level !== undefined ? "H" + value.level : undefined,
		};
	}

	protected onRenderSuggestion(): void {}

	selectSuggestion(
		value: { subpath: string; level?: number },
		_evt: MouseEvent | KeyboardEvent
	): void {
		const prefix = value.level === undefined ? "^" : "#";
		this.component.setValue(prefix + value.subpath);
		this.component.onChanged();
	}
}

class FileDataSuggest extends InputSuggest<string> {
	protected getSuggestions(query: string): string[] | Promise<string[]> {
		const suggestions = [...fileDataColumnValueOptions];
		if (!query) return suggestions;
		return suggestions.filter((s) => s.includes(query));
	}

	protected parseSuggestion(value: string): Suggestion {
		return {
			title: value,
		};
	}

	protected onRenderSuggestion(): void {}

	selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
		this.component.setValue(value);
		this.component.onChanged();
	}
}
