import {
	App,
	Menu,
	ProgressBarComponent,
	setIcon,
	Setting,
	stringifyYaml,
	SuggestModal,
	TextComponent,
	TFile,
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
	PropertySuggestModal,
} from "@/classes/PropertySuggest";
import BetterProperties from "@/main";

// TODO Allow selecting nested properties to do clipboard actions like obsidian allows

export const RelationWidget: CustomTypeWidget<string> = {
	type: "relation",
	icon: "arrow-up-right",
	default: () => "",
	name: () => text("typeWidgets.relation.name"),
	validate: (v) => typeof v === "string",
	render: (plugin, el, data, ctx) => {
		const { relatedProperty } = plugin.settings.propertySettings[
			data.key.toLowerCase()
		]?.["relation"] ?? {
			...defaultPropertySettings["relation"],
		};
		// const container = el.createDiv({
		// 	cls: "better-properties-relation-container",
		// });
		const { value } = data;

		if (!value || !relatedProperty) {
			const btnContainer = el.createDiv({
				cls: "metadata-input-longtext",
			});

			if (!value) {
				console.log("no val: ", value);
				btnContainer
					.createEl("button", {
						text: "choose note",
						attr: {
							style: "margin-top: 0px;",
						},
					})
					.addEventListener("click", async () => {
						new FileSuggestModal(plugin.app, (file) => {
							const link = plugin.app.fileManager.generateMarkdownLink(
								file,
								ctx.sourcePath
							);

							ctx.onChange(link);
							plugin.refreshPropertyEditor(data.key);
						}).open();
					});
			}

			if (!relatedProperty) {
				// TODO this is lazy
				btnContainer.createSpan().innerHTML = "&nbsp;&nbsp;";
				btnContainer
					.createEl("button", {
						text: "set property",
						attr: {
							style: "margin-top: 0px;",
						},
					})
					.addEventListener("click", () =>
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
			}

			return;
		}

		el.createDiv({ text: value });
	},
};

// TODO put into obsidian functions
const getFileFromMarkdownLink = (mdLink: string) => {
	const noBrackets =
		mdLink.startsWith("[[") && mdLink.endsWith("]]")
			? mdLink.slice(2, -2)
			: mdLink;
	const nonAliased = mdLink.split(/(?<!\\)\|/g)[0];
};

export const createRelationSettings = (
	el: HTMLElement,
	form: PropertySettings["relation"],
	updateForm: <T extends keyof PropertySettings["relation"]>(
		key: T,
		value: PropertySettings["relation"][T]
	) => void,
	plugin: BetterProperties
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
