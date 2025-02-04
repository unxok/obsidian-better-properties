import { createInternalLinkEl } from "@/libs/utils/obsidian";
import { findKeyInsensitive, updateNestedObject } from "@/libs/utils/pure";
import BetterProperties from "@/main";
import {
	Field,
	FileItem,
	FileDataField,
	PropertyField,
	TagsField,
} from "@/MetaView/shared";
import { MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import {
	PropertyEntryData,
	MetadataEditor,
	PropertyRenderContext,
} from "obsidian-typings";

type RenderCellArgs<T extends Field = Field> = {
	plugin: BetterProperties;
	mdrc: MarkdownRenderChild;
	ctx: MarkdownPostProcessorContext;
	wrapperEl: HTMLElement;
	item: FileItem;
	col: T;
};
export const renderCell = (args: RenderCellArgs) => {
	switch (args.col.type) {
		case "fileData":
			return renderFileDataCell(args as RenderCellArgs<FileDataField>);
		case "property":
			return renderPropertyCell(args as RenderCellArgs<PropertyField>);
		case "tags":
			return renderTagsCell(args as RenderCellArgs<TagsField>);
	}
};

const renderFileDataCell = ({
	wrapperEl,
	item: { file },
	col,
}: RenderCellArgs<FileDataField>) => {
	wrapperEl.classList.add("mod-filedata");
	switch (col.value) {
		case "file-link":
			return wrapperEl.appendChild(createInternalLinkEl(file));
		case "file-name":
			return (wrapperEl.textContent = file.basename);
		case "file-created":
			return (wrapperEl.textContent = new Date(
				file.stat.ctime
			).toLocaleString());
		case "file-modified":
			return (wrapperEl.textContent = new Date(
				file.stat.mtime
			).toLocaleString());
		case "file-path":
			return (wrapperEl.textContent = file.path);
		case "file-size":
			return (wrapperEl.textContent = file.stat.size + " bytes");
	}
};

const renderPropertyCell = ({
	plugin,
	mdrc,
	ctx,
	col,
	item: { file, metadata },
	wrapperEl,
}: RenderCellArgs<PropertyField>) => {
	const {
		app: { metadataTypeManager, fileManager },
	} = plugin;

	const fm = metadata?.frontmatter ?? {};

	const dotKeys = col.value.split(".");
	const propertyKey = dotKeys[dotKeys.length - 1];
	const propertyKeyWithDots = col.value;
	const foundKey = findKeyInsensitive(propertyKey, fm) ?? propertyKey;
	const propertyValue = fm[foundKey] ?? null;

	const updateProperty = async (value: unknown) => {
		await fileManager.processFrontMatter(file, (fm) => {
			if (col.value.includes(".")) {
				return updateNestedObject(fm, propertyKeyWithDots, value);
			}
			fm[foundKey] = value;
		});
	};

	const assignedType =
		metadataTypeManager.getAssignedType(propertyKey) ?? "text";
	const widget = metadataTypeManager.registeredTypeWidgets[assignedType];
	widget.render(
		wrapperEl,
		{
			key: propertyKey,
			type: assignedType,
			value: propertyValue,
			dotKey: propertyKeyWithDots,
		} as PropertyEntryData<unknown>,
		{
			app: plugin.app,
			blur: () => {},
			key: propertyKey,
			dotKey: propertyKeyWithDots,
			metadataEditor: {
				register: (cb) => mdrc.register(cb),
			} as MetadataEditor,
			onChange: async (v) => await updateProperty(v),
			sourcePath: ctx.sourcePath,
		} as PropertyRenderContext
	);
};

const renderTagsCell = ({
	col: _col,
	item: { metadata },
	wrapperEl,
}: RenderCellArgs<TagsField>) => {
	const tagContainer = wrapperEl.createDiv({
		cls: "better-properties-metaview-tags-container",
	});
	if (!metadata?.tags?.length) return;
	const uniqueTags = new Set(metadata.tags.map(({ tag }) => tag));
	uniqueTags.forEach((tag) => {
		tagContainer.createSpan().createEl("a", {
			text: tag,
			href: tag,
			cls: "tag",
			attr: {
				target: "_blank",
				rel: "noopener nofollow",
			},
		});
	});
};
