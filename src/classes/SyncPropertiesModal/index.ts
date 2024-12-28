import BetterProperties from "@/main";
import { CachedMetadata, Menu, Modal, Setting, TFile } from "obsidian";
import { MetadataEditor } from "obsidian-typings";
import { ConfirmationModal } from "../ConfirmationModal";
import { text } from "@/i18Next";
import { PropertySuggest } from "../PropertySuggest";
import { FileSuggest } from "../FileSuggest";
import { FolderSuggest } from "../FolderSuggest";
import { TagSuggest } from "../TagSuggest";

// export const getTemplateID = (
// 	metaCache: CachedMetadata,
// 	plugin: BetterProperties
// ) => {
// 	const {
// 		settings: { templateIdName },
// 	} = plugin;

// 	const findLower = () => {
// 		const found = Object.keys(metaCache).find((key) => {
// 			key.toLowerCase() === templateIdName;
// 		});
// 		if (!found) return null;
// 		return metaCache[found as keyof typeof metaCache];
// 	};

// 	const id = metaCache?.frontmatter?.[templateIdName] ?? findLower();
// 	if (!id) {
// 		new Notice(text("notices.noTemplateId"));
// 		return;
// 	}
// 	if (Array.isArray(id)) {
// 		new Notice(text("notices.templateIdIsArray"));
// 		return;
// 	}
// 	const parsedId: string = id.toString();
// 	return parsedId;
// };

// export const doSync = async (
// 	// file: TFile,
// 	metaCache: CachedMetadata,
// 	plugin: BetterProperties,
// 	templateId: string
// ) => {
// 	const {
// 		settings: { templateIdName, templatePropertyName },
// 		app,
// 	} = plugin;

// 	const parsedId = templateId;

// 	const templateEntries = Object.entries(metaCache.frontmatter ?? {});

// 	const hashes = Object.entries(app.metadataCache.metadataCache)
// 		.map(([hash, metadata]) => {
// 			if (!metadata.frontmatter) return null;
// 			const exactMatch = metadata.frontmatter[templatePropertyName];
// 			if (
// 				exactMatch === parsedId ||
// 				(Array.isArray(exactMatch) && exactMatch.includes(parsedId))
// 			)
// 				return hash;
// 			// try to find case insensitively
// 			const isMatch = Object.entries(metadata.frontmatter).some(
// 				([prop, value]) => {
// 					const a = prop.toLowerCase() === templatePropertyName.toLowerCase();
// 					const b1 = value === parsedId;
// 					const b2 = Array.isArray(value) && value.includes(parsedId);
// 					const b = b1 || b2;
// 					return a && b;
// 				}
// 			);
// 			return isMatch ? hash : null;
// 		})
// 		.filter((h) => h !== null);

// 	const fileHashMap = new Map<string, TFile>();

// 	Object.entries(app.metadataCache.fileCache).forEach(([path, { hash }]) => {
// 		const f = app.vault.getFileByPath(path);
// 		if (!f) return;
// 		fileHashMap.set(hash, f);
// 	});

// 	let count = 0;
// 	await Promise.all(
// 		hashes.map(async (hash) => {
// 			const f = fileHashMap.get(hash);
// 			if (!f) return;
// 			count++;
// 			await app.fileManager.processFrontMatter(f, (fm) => {
// 				templateEntries.forEach(([prop, val]) => {
// 					// don't add the template id property
// 					if (prop === templateIdName) return;
// 					// if already has property, skip
// 					if (fm.hasOwnProperty(prop) || fm.hasOwnProperty(prop.toLowerCase()))
// 						return;
// 					fm[prop] = val;
// 					// TODO add flag to delete or keep props not in template
// 				});
// 			});
// 		})
// 	);

// 	new Notice("Synchronized properties with " + count + " notes.");
// };

// export class SyncPropertiesModalOld extends ConfirmationModal {
// 	plugin: BetterProperties;
// 	metadataEditor: MetadataEditor;
// 	// file: TFile;
// 	metaCache: CachedMetadata;
// 	templateId: string;
// 	constructor(
// 		plugin: BetterProperties,
// 		metadataeditor: MetadataEditor,
// 		// file: TFile,
// 		metaCache: CachedMetadata,
// 		templateId: string
// 	) {
// 		super(plugin.app);
// 		this.plugin = plugin;
// 		this.metadataEditor = metadataeditor;
// 		// this.file = file;
// 		this.metaCache = metaCache;
// 		this.templateId = templateId;
// 	}

// 	onOpen(): void {
// 		const { contentEl, metaCache, plugin, templateId } = this;

// 		contentEl.empty();

// 		this.setTitle("Synchronize properties");

// 		contentEl.createEl("p", {
// 			text: "Synchronize this notes properties to others notes that match this note's property template id.",
// 		});
// 		contentEl.createEl("p", {
// 			text: "This will only add properties from the template, so additional properties in the target notes will be unaffected.",
// 		});
// 		this.createButtonContainer();
// 		this.createCheckBox({
// 			text: "Don't ask again",
// 			defaultChecked: !plugin.settings.showSyncTemplateWarning,
// 			onChange: async (b) =>
// 				plugin.updateSettings((prev) => ({
// 					...prev,
// 					showSyncTemplateWarning: !b,
// 				})),
// 		});
// 		this.createFooterButton((cmp) =>
// 			cmp.setButtonText("cancel").onClick(() => this.close())
// 		).createFooterButton((cmp) =>
// 			cmp
// 				.setButtonText("synchronize")
// 				.setCta()
// 				.onClick(async () => {
// 					await doSync(metaCache, this.plugin, templateId);
// 					this.close();
// 				})
// 		);
// 	}
// }

const conditionTypes = ["folder", "tag", "property"] as const;
type ConditionType = (typeof conditionTypes)[number];

type FolderCondition = {
	conditionType: "folder";
	state: {
		operator: string;
		folderPath: string;
	};
};

type TagCondition = {
	conditionType: "tag";
	state: {
		operator: string;
		tagName: string;
	};
};

type PropertyCondition = {
	conditionType: "property";
	state: {
		operator: string;
		propertyName: string;
		propertyValue: string;
	};
};

type SyncPropertiesModalForm = {
	fromFileType: "linked" | "selected";
	fromNoteLinkedProperty: string;
	fromFileSelectedPath: string;
	toFilesConditions: (FolderCondition | TagCondition | PropertyCondition)[];
};

const defaultForm: SyncPropertiesModalForm = {
	fromFileType: "linked",
	fromNoteLinkedProperty: "",
	fromFileSelectedPath: "",
	toFilesConditions: [],
};

export class SyncPropertiesModal extends ConfirmationModal {
	public form: SyncPropertiesModalForm = { ...defaultForm };

	constructor(public plugin: BetterProperties, public activeFile?: TFile) {
		super(plugin.app);
	}

	updateForm<T extends keyof SyncPropertiesModalForm>(
		key: T,
		cb: (prev: SyncPropertiesModalForm[T]) => SyncPropertiesModalForm[T]
	) {
		const newForm = { ...this.form };
		newForm[key] = cb(newForm[key]);
		this.form = newForm;
	}

	onOpen(): void {
		const { contentEl, activeFile } = this;
		contentEl.empty();

		this.setTitle("Synchronize properties");

		const p = contentEl.createDiv({
			cls: "better-properties-sync-properties-modal-active-file-container",
		});
		p.createEl("b", { text: "Active note: " });
		p.createSpan({ text: activeFile?.path ?? "no active note" });

		new Setting(contentEl).setHeading().setName("From note");

		type FromFileType = {
			value: SyncPropertiesModalForm["fromFileType"];
			display: string;
			render: (container: HTMLElement) => void;
		};

		const fromFileTypeOptions: FromFileType[] = [
			{
				value: "linked",
				display: "Linked in active note",
				render: (container) => {
					new Setting(container)
						.setName("Property")
						.setDesc("The property which contains a link to a note")
						.addSearch((cmp) => {
							cmp.setPlaceholder("Property name");
							cmp.onChange((v) =>
								this.updateForm("fromNoteLinkedProperty", () => v)
							);
							new PropertySuggest(this.app, cmp);
						});
				},
			},
			{
				value: "selected",
				display: "Select a note",
				render: (container) => {
					new Setting(container)
						.setName("File path")
						.setDesc("Select a note from a dropdown to get the file path.")
						.addSearch((cmp) => {
							cmp.setPlaceholder("File path");
							cmp.onChange((v) =>
								this.updateForm("fromFileSelectedPath", () => v)
							);
							new FileSuggest(this.app, cmp);
						});
				},
			},
		];

		new Setting(contentEl)
			.setName("Type")
			.setDesc("How the note will be determined")
			.addDropdown((cmp) => {
				fromFileTypeOptions.forEach(({ value, display }) =>
					cmp.addOption(value, display)
				);
				cmp.then(() => {
					const container = contentEl.createDiv();
					container.createDiv(); // so borders for settings don't get messed up
					const findRenderer = (v: string) => {
						const found = fromFileTypeOptions.find(({ value }) => v === value);
						if (!found) return;
						container.empty();
						container.createDiv(); // so borders for settings don't get messed up
						found.render(container);
					};
					cmp.onChange(findRenderer);
					cmp.setValue(this.form.fromFileType);
					findRenderer(cmp.getValue());
				});
			});

		new Setting(contentEl).setHeading().setName("To notes");

		type ConditionTypeOption = {
			value: ConditionType;
			display: string;
			icon: string;
			renderer: (container: HTMLElement, index: number) => void;
		};

		const conditionTypeOptions: ConditionTypeOption[] = [
			{
				value: "folder",
				display: "Folder",
				icon: "folder",
				renderer: (container, index) => {
					const condition: FolderCondition = {
						conditionType: "folder",
						state: {
							operator: "in",
							folderPath: "",
						},
					};
					this.form.toFilesConditions.push(condition);
					const operatorOptions = [
						["in", "In folder"],
						["inSub", "In folder (or its subfolders)"],
						["notIn", "Not in folder"],
						["notInSub", "Not in folder (or its subfolders)"],
					];

					new Setting(container)
						.setName("Folder")
						.addDropdown((cmp) => {
							cmp.onChange((v) => (condition.state.operator = v));
							operatorOptions.forEach(([v, d]) => cmp.addOption(v, d));
						})
						.addSearch((cmp) => {
							cmp.setPlaceholder("Folder path");
							cmp.onChange((v) => (condition.state.folderPath = v));
							new FolderSuggest(this.app, cmp);
						});
				},
			},
			{
				value: "tag",
				display: "Tag",
				icon: "tag",
				renderer: (container) => {
					const condition: TagCondition = {
						conditionType: "tag",
						state: {
							operator: "contains",
							tagName: "",
						},
					};
					this.form.toFilesConditions.push(condition);
					const operatorOptions = [
						["contains", "Contains tag"],
						["containsNested", "Contains tag or nested tag"],
						["notContains", "Doesn't contain tag"],
						["notContainsNested", "Doesn't contain tag or nested tag"],
					];

					new Setting(container)
						.setName("Tag")
						.addDropdown((cmp) => {
							cmp.onChange((v) => (condition.state.operator = v));
							operatorOptions.forEach(([v, d]) => cmp.addOption(v, d));
						})
						.addSearch((cmp) => {
							cmp.setPlaceholder("Tag name");
							cmp.onChange((v) => (condition.state.tagName = v));
							new TagSuggest(this.app, cmp);
						});
				},
			},
			{
				value: "property",
				display: "Property",
				icon: "archive",
				renderer: (container) => {
					const condition: TagCondition = {
						conditionType: "tag",
						state: {
							operator: "contains",
							tagName: "",
						},
					};
					this.form.toFilesConditions.push(condition);
					const operatorOptions = [
						["propEquals", "Property equals value"],
						["notPropEquals", "Property doesn't equal value"],
						["propLinksActive", "Property links to active note"],
					];

					new Setting(container)
						.setName("Tag")
						.addDropdown((cmp) => {
							cmp.onChange((v) => (condition.state.operator = v));
							operatorOptions.forEach(([v, d]) => cmp.addOption(v, d));
						})
						.addSearch((cmp) => {
							cmp.setPlaceholder("Tag name");
							cmp.onChange((v) => (condition.state.tagName = v));
							new TagSuggest(this.app, cmp);
						});
				},
			},
		];

		const conditionsContainer = contentEl.createDiv();
		conditionsContainer.createDiv(); // so borders for settings don't get messed up

		new Setting(contentEl)
			.addButton((cmp) =>
				cmp
					.setButtonText("new condition")
					.setCta()
					.onClick((e) => {
						const m = new Menu();
						conditionTypeOptions.forEach(({ display, icon, renderer }) =>
							m.addItem((item) =>
								item
									.setTitle(display)
									.setIcon(icon)
									.onClick(() => {
										renderer(
											conditionsContainer,
											this.form.toFilesConditions.length
										);
									})
							)
						);
						m.showAtMouseEvent(e);
					})
			)
			.then((s) => {
				s.infoEl.remove();
			});

		this.createFooterButton((cmp) =>
			cmp.setButtonText("view form data").onClick(() => {
				const json = JSON.stringify(this.form, undefined, 2);
				const modal = new Modal(this.app);
				modal.onOpen = () => {
					modal.contentEl.empty();
					modal.setTitle("Form data");
					modal.contentEl
						.createEl("p")
						.createEl("pre")
						.createEl("code", { text: json });
				};
				modal.open();
			})
		);
		this.createFooterButton((cmp) => cmp.setButtonText("cancel"));
		this.createFooterButton((cmp) => cmp.setButtonText("synchronize").setCta());
	}
}
