import { getValueByKeys, parseObjectPathString } from "#/lib/utils";
import { BetterProperties } from "#/Plugin";
import { Component, TFile } from "obsidian";

export const initPropertyLinkRender = ({
	plugin,
	file,
	component,
	containerEl,
	property,
	hideKey,
}: {
	plugin: BetterProperties;
	file: TFile;
	component: Component;
	containerEl: HTMLElement;
	property: string;
	hideKey: boolean;
}) => {
	const renderer = new PropertyLinkRenderer(
		plugin,
		file,
		containerEl,
		property,
		hideKey
	);

	plugin.propertyLinkManager.renderers.add(renderer);
	component.register(() => {
		plugin.propertyLinkManager.renderers.delete(renderer);
	});

	renderer.renderProperty();
	return renderer;
};

export class PropertyLinkRenderer {
	constructor(
		public plugin: BetterProperties,
		public file: TFile,
		public containerEl: HTMLElement,
		public property: string,
		public hideKey: boolean
	) {}

	renderProperty(): void {
		const { plugin, file, containerEl, property, hideKey } = this;
		const { frontmatter } = plugin.app.metadataCache.getFileCache(file) ?? {};
		const value = frontmatter
			? getValueByKeys({
					obj: frontmatter,
					keys: parseObjectPathString(property),
					insensitive: true,
			  })
			: undefined;
		const { expected: widget } = plugin.app.metadataTypeManager.getTypeInfo(
			property,
			value
		);

		containerEl.empty();
		widget.render(
			containerEl.createDiv("metadata-property").createDiv({
				cls: "metadata-property-value",
				attr: {
					"data-better-properties--hide-key": hideKey,
					"data-property-type": widget.type,
				},
			}),
			value,
			{
				app: plugin.app,
				blur() {},
				key: property,
				onChange(value) {
					void plugin.app.fileManager.processFrontMatter(file, (fm) => {
						(fm as Record<string, unknown>)[property] = value;
					});
				},
				sourcePath: file.path,
			}
		);
	}
}
