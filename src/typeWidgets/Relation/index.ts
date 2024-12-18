import {
	App,
	CachedMetadata,
	FrontMatterCache,
	Keymap,
	Menu,
	ProgressBarComponent,
	setIcon,
	Setting,
	stringifyYaml,
	SuggestModal,
	TextComponent,
	TFile,
} from "obsidian";
import {
	CreatePropertySettings,
	defaultPropertySettings,
	PropertySettings,
} from "@/PropertySettings";
import { CustomTypeWidget, WidgetAndSettings } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { PropertyEntryData, PropertyRenderContext } from "obsidian-typings";
import { getFileFromMarkdownLink, tryParseYaml } from "@/libs/utils/obsidian";
import { findKeyInsensitive } from "@/libs/utils/pure";
import {
	PropertySuggest,
	PropertySuggestModal,
} from "@/classes/PropertySuggest";
import BetterProperties from "@/main";

// TODO Allow selecting nested properties to do clipboard actions like obsidian allows

const typeKey: CustomTypeWidget["type"] = "relation";

export const widget: CustomTypeWidget<string> = {
	type: typeKey,
	icon: "arrow-up-right",
	default: () => "",
	name: () => text("typeWidgets.relation.name"),
	validate: (v) => typeof v === "string",
	render: (plugin, el, data, ctx) => {
		const { relatedProperty } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.[typeKey] ?? {
			...defaultPropertySettings[typeKey],
		};
		// const container = el.createDiv({
		// 	cls: "better-properties-relation-container",
		// });
		const { value } = data;

		if (value && relatedProperty) {
			const file = getFileFromMarkdownLink(plugin.app, ctx.sourcePath, value);
			if (!file) {
				const btnContainer = createContainer(el);
				btnContainer.createDiv({ text: "Note not found" }).style.color =
					"var(--text-error)";
				const xBtn = btnContainer.createSpan({ cls: "clickable-icon" });
				setIcon(xBtn, "x");
				xBtn.addEventListener("click", () => {
					ctx.onChange("");
					plugin.refreshPropertyEditor(data.key);
				});
				return;
			}

			const relationType =
				plugin.app.metadataTypeManager.getAssignedType(relatedProperty) ??
				"text";
			const relationWidget = Object.values(
				plugin.app.metadataTypeManager.registeredTypeWidgets
			).find((w) => w.type === relationType);

			if (!relationWidget) {
				const btnContainer = createContainer(el);
				btnContainer.createSpan({ text: "Note not found" }).style.color =
					"var(--text-error)";
				createChangePropertyBtn(plugin, btnContainer, data);
				return;
			}

			const relatedCache = plugin.app.metadataCache.getCache(file.path);
			const { frontmatter } = relatedCache ?? {};

			const relatedValue = getRelatedValue(relatedProperty, frontmatter);

			const renderRelationWiddget = () => {
				relationWidget.render(
					el,
					{ key: relatedProperty, type: relationType, value: relatedValue },
					{
						...ctx,
						onChange: (v) => {
							plugin.app.fileManager.processFrontMatter(
								file,
								(fm: Record<string, unknown>) => {
									const foundKey =
										findKeyInsensitive(relatedProperty, fm) ?? relatedProperty;
									fm[foundKey] = v;
								}
							);
						},
					}
				);

				const relatedLinkEl = el.createDiv({
					cls: "clickable-icon",
					attr: { "aria-label": 'Open related note\n"' + file.basename + '"' },
				});

				setIcon(relatedLinkEl, "arrow-up-right");

				relatedLinkEl.addEventListener("click", (e) => {
					plugin.app.workspace.openLinkText(
						file.path,
						ctx.sourcePath,
						Keymap.isModEvent(e)
					);
				});

				relatedLinkEl.addEventListener("contextmenu", (e) => {
					new Menu()
						.addItem((item) =>
							item.setTitle("Set Note").onClick(() => {
								const create = createSetNoteBtn(
									plugin,
									document.body,
									data,
									ctx
								);
								create.click();
								create.remove();
							})
						)
						.addItem((item) =>
							item.setTitle("Change property").onClick(() => {
								const create = createChangePropertyBtn(
									plugin,
									document.body,
									data
								);
								create.click();
								create.remove();
							})
						)
						.showAtMouseEvent(e);
				});
			};

			renderRelationWiddget();
			const onMDCChanged = (
				changedFile: TFile,
				_fmYaml: string,
				cache: CachedMetadata
			) => {
				if (changedFile.path !== file.path) return;
				const changedFm = cache.frontmatter ?? {};
				const k = findKeyInsensitive(relatedProperty, changedFm);
				const changedValue = k ? changedFm[k] : undefined;
				if (changedValue === relatedValue) return;
				plugin.refreshPropertyEditor(data.key);
			};

			plugin.app.metadataCache.on("changed", onMDCChanged);
			ctx.metadataEditor.register(() => {
				// @ts-ignore TODO incorrect-type match
				plugin.app.metadataCache.off("changed", onMDCChanged);
			});

			return;
		}

		const btnContainer = createContainer(el);

		if (!value) {
			createSetNoteBtn(plugin, btnContainer, data, ctx);
		}

		if (!relatedProperty) {
			createChangePropertyBtn(plugin, btnContainer, data);
		}
	},
};

const createContainer = (parentEl: HTMLElement) => {
	return parentEl.createDiv({
		cls: "metadata-input-longtext better-properties-relation-container",
	});
};

const getRelatedValue = (
	relatedProperty: string,
	frontmatter: FrontMatterCache | undefined
) => {
	if (!frontmatter) {
		return undefined;
	}
	const foundValue = frontmatter[relatedProperty];
	if (foundValue) {
		return foundValue;
	}
	const foundKey = findKeyInsensitive(relatedProperty, frontmatter);
	if (!foundKey) {
		return undefined;
	}
};

const createChangePropertyBtn = (
	plugin: BetterProperties,
	btnContainer: HTMLElement,
	data: PropertyEntryData<string>
) => {
	// TODO this is lazy
	btnContainer.createSpan().innerHTML = "&nbsp;&nbsp;";
	const btn = btnContainer.createEl("button", {
		text: "set property",
		attr: {
			style: "margin-top: 0px;",
		},
	});

	btn.addEventListener("click", () =>
		new PropertySuggestModal(plugin.app, async ({ property }) => {
			await plugin.updatePropertySetting(data.key, (prev) => ({
				...prev,
				relation: {
					...prev.relation,
					relatedProperty: property,
				},
			}));
			plugin.refreshPropertyEditor(data.key);
		}).open()
	);

	return btn;
};

const createSetNoteBtn = (
	plugin: BetterProperties,
	btnContainer: HTMLElement,
	data: PropertyEntryData<string>,
	ctx: PropertyRenderContext
) => {
	const btn = btnContainer.createEl("button", {
		text: "choose note",
		attr: {
			style: "margin-top: 0px;",
		},
	});

	btn.addEventListener("click", async () => {
		new FileSuggestModal(plugin.app, (file) => {
			const link = plugin.app.fileManager.generateMarkdownLink(
				file,
				ctx.sourcePath
			);

			ctx.onChange(link);
			plugin.refreshPropertyEditor(data.key);
		}).open();
	});

	return btn;
};

export const createSettings: CreatePropertySettings<typeof typeKey> = (
	el,
	form,
	updateForm,
	plugin
) => {
	const { content } = createSection(el, "relation", true);

	new Setting(content)
		.setName("Related property")
		.setDesc("The property name this relation property is linked to.")
		.addSearch((cmp) =>
			cmp
				.setValue(form.relatedProperty)
				.onChange((v) => {
					updateForm("relatedProperty", v);
				})
				.then((cmp) => new PropertySuggest(plugin.app, cmp))
		);
};

const compare = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: true,
}).compare;

class FileSuggestModal extends SuggestModal<TFile> {
	constructor(
		app: App,
		public onSelect: (
			file: TFile,
			e: MouseEvent | KeyboardEvent
		) => void | Promise<void>
	) {
		super(app);
	}

	getSuggestions(query: string): TFile[] | Promise<TFile[]> {
		const { app } = this;
		const lower = query.toLowerCase();
		const files = app.vault.getMarkdownFiles();
		if (!lower) return files;
		return files
			.filter((f) => f.path.toLowerCase().includes(lower))
			.toSorted((a, b) => compare(a.path, b.path));
	}

	renderSuggestion(value: TFile, el: HTMLElement): void {
		el.createDiv({ cls: "suggestion-content" }).createDiv({
			text: value.path,
			cls: "suggestion-title",
		});
	}

	async onChooseSuggestion(
		item: TFile,
		evt: MouseEvent | KeyboardEvent
	): Promise<void> {
		await this.onSelect(item, evt);
	}
}

export const Relation: WidgetAndSettings = [widget, createSettings];
