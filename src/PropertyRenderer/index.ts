import { ConfirmationModal } from "@/classes/ConfirmationModal";
import { FileSuggest } from "@/classes/FileSuggest";
import { codePrefix } from "@/classes/InlineCodeWidget";
import { PropertySuggest } from "@/classes/PropertySuggest";
import { tryParseYaml } from "@/libs/utils/obsidian";
import { findKeyInsensitive } from "@/libs/utils/pure";
import BetterProperties from "@/main";
import {
	MarkdownPostProcessorContext,
	FrontMatterCache,
	TFile,
	CachedMetadata,
	MarkdownRenderChild,
	Component,
	Command,
	App,
	Setting,
} from "obsidian";
import { MetadataEditor, PropertyInfo } from "obsidian-typings";
import { z, ZodError } from "zod";

export const PropertyCodeBlockSchema = z.object({
	propertyName: z
		.string()
		.min(1, "Property name must be at least one character."),
	filePath: z
		.string()
		.min(1, "File path must be at least one character.")
		.optional(),
	cssClass: z.string().optional(),
});

type PropertyRendererData = z.infer<typeof PropertyCodeBlockSchema>;

export const renderYamlParseError = (el: HTMLElement, msg: string) => {
	el.style.setProperty("color", "var(--text-error)");
	el.createDiv({ text: "Failed to parse YAML." });
	el.createDiv({ text: msg });
	return;
};

export const renderZodParseError = (
	el: HTMLElement,
	err: ZodError<PropertyRendererData>
) => {
	el.style.setProperty("color", "var(--text-error)");
	el.createDiv({ text: "Invalid config provided." });
	err.issues.forEach((e) => {
		el.createDiv({ text: e.path.join(", ") + ": " + e.message });
	});
	return;
};

export const renderPropertyTypeWidget = (
	el: HTMLElement,
	data: PropertyRendererData,
	plugin: BetterProperties,
	sourcePath: string,
	component: Component
) => {
	const config = {
		filePath: sourcePath,
		...data,
	};

	if (data.cssClass) {
		const arr = data.cssClass.split(" ");
		el.classList.add(...arr);
	}

	const nameLower = config.propertyName.toLocaleLowerCase();

	const typeInfo: PropertyInfo =
		plugin.app.metadataTypeManager.getPropertyInfo(nameLower) ?? {
			name: config.propertyName,
			count: 0,
			type: "text",
		};

	const getFrontmatter = () => {
		const fileCacheRecord =
			plugin.app.metadataCache.fileCache[config.filePath];
		if (!fileCacheRecord) {
			// console.log("nope: ", config.filePath);
			// deal with this
			return;
		}
		const frontmatter =
			plugin.app.metadataCache.metadataCache[fileCacheRecord.hash]
				?.frontmatter;
		return frontmatter;
	};

	const getValue = (frontmatter: FrontMatterCache) => {
		const possibleValue = frontmatter.hasOwnProperty(config.propertyName)
			? frontmatter[config.propertyName]
			: findKeyInsensitive(config.propertyName, frontmatter);
		return possibleValue ?? "";
	};

	const currentFm = getFrontmatter();
	if (!currentFm) {
		// deal with this
		return;
	}
	const currentValue = getValue(currentFm);

	const onMetadataChange = (
		file: TFile,
		_data: string,
		cache: CachedMetadata
	) => {
		const newType =
			plugin.app.metadataTypeManager.getPropertyInfo(nameLower)?.type;
		if (file.path !== config.filePath) return;
		const fm = cache.frontmatter;
		if (!fm) {
			// deal with this
			return;
		}
		const value = getValue(fm);
		if (value === currentValue) return;
		render(value, newType);
	};
	plugin.app.metadataCache.on("changed", onMetadataChange);

	const onTypeChange = (...data: unknown[]) => {
		const updatedKey = data[0] as string;
		if (updatedKey !== nameLower) return;
		const newType =
			plugin.app.metadataTypeManager.getPropertyInfo(nameLower)?.type;
		// if (newType === typeInfo.type) return;
		const fm = getFrontmatter();
		if (!fm) {
			// deal with this
			return;
		}
		const value = getValue(fm);
		render(value, newType);
	};

	plugin.app.metadataTypeManager.on("changed", onTypeChange);

	component.register(() => {
		// @ts-ignore
		plugin.app.metadataCache.off("changed", onMetadataChange);
		plugin.app.metadataTypeManager.off("changed", onTypeChange);
	});

	const fakeMetadataEditor: Pick<MetadataEditor, "register"> = {
		register: (cb) => {
			// console.log("register called");
			component.register(cb);
		},
	};

	const render = (value: unknown, type: string) => {
		el.empty();

		const widget =
			plugin.app.metadataTypeManager.registeredTypeWidgets[type] ??
			plugin.app.metadataTypeManager.registeredTypeWidgets["text"];
		widget.render(
			el,
			{
				key: config.propertyName,
				type: type,
				value,
			},
			{
				app: plugin.app,
				blur: () => {},
				key: config.propertyName,
				metadataEditor: fakeMetadataEditor as MetadataEditor,
				onChange: (value) => {
					// console.log("value changed: ", value);
					const filePath = config.filePath
						.toLowerCase()
						.endsWith("md")
						? config.filePath
						: config.filePath + ".md";
					const file = plugin.app.vault.getFileByPath(filePath);
					if (!file) {
						// deal with this
						// console.log("no file found");
						return;
					}
					plugin.app.fileManager.processFrontMatter(file, (fm) => {
						const key = fm.hasOwnProperty(config.propertyName)
							? config.propertyName
							: findKeyInsensitive(config.propertyName, fm) ??
							  config.propertyName;
						fm[key] = value;
					});
				},
				sourcePath: plugin.app.workspace.activeEditor?.file?.path ?? "",
			}
		);
	};

	render(currentValue, typeInfo.type);
	// console.log("parsed: ", parsed.data);
};

export const propertyCodeBlock = (
	plugin: BetterProperties,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	el.empty();
	const result = tryParseYaml(source);
	if (!result.success) {
		const msg =
			result.error instanceof Error
				? result.error.message
				: "unknown error";
		renderYamlParseError(el, msg);
		return;
	}
	const parsed = PropertyCodeBlockSchema.safeParse(result.data);
	if (!parsed.success) {
		renderZodParseError(el, parsed.error);
		return;
	}

	const mdrc = new MarkdownRenderChild(el);
	ctx.addChild(mdrc);

	renderPropertyTypeWidget(el, parsed.data, plugin, ctx.sourcePath, mdrc);
};

export const insertPropertyEditorInline: Command = {
	id: "insert-inline-property-editor",
	name: "Insert inline property editor",
	editorCallback: (editor, ctx) => {
		const modal = new InsertPropertyEditorModal(ctx.app, (data) => {
			const entries = Object.entries(data)
				.map(([key, value]) => key + ": " + value)
				.join(", ");
			const str = "`" + codePrefix + entries + "`";
			const pos = editor.getCursor();
			editor.replaceRange(str, pos, pos);
			modal.close();
		});
		modal.open();
	},
};

class InsertPropertyEditorModal extends ConfirmationModal {
	constructor(
		app: App,
		private onSubmit: (data: PropertyRendererData) => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, onSubmit } = this;
		contentEl.empty();
		this.setTitle("Insert property editor");
		contentEl.createEl("p", {
			text: "Insert syntax into the editor to render an editable property value.",
		});

		const data: PropertyRendererData = {
			propertyName: "",
		};

		new Setting(contentEl)
			.setName("Property name")
			.setDesc("The name of the frontmatter property to edit.")
			.addSearch((cmp) => {
				cmp.onChange((v) => (data.propertyName = v));
				new PropertySuggest(this.app, cmp);
			});

		new Setting(contentEl)
			.setName("File path")
			.setDesc(
				"The path to the file to update. Defaults to current file."
			)
			.addSearch((cmp) => {
				cmp.onChange((v) => (data.filePath = v));
				new FileSuggest(this.app, cmp);
			});

		new Setting(contentEl)
			.setName("CSS Class")
			.setDesc(
				"The CSS class to set for the element. Separate multiple names with a space."
			)
			.addText((cmp) => cmp.onChange((v) => (data.cssClass = v)));

		this.createFooterButton((cmp) =>
			cmp
				.setCta()
				.setButtonText("insert")
				.onClick(() => this.onSubmit(data))
		);
	}
}
