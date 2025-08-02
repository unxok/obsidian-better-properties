import { Events, Workspace as BaseWorkspace } from "obsidian";
import {
	MetadataTypeManager as BaseMetadataTypeManager,
	PropertyWidget as BasePropertyWidget,
	MetadataEditor as BaseMetadataEditor,
	PropertyEntryData,
} from "obsidian-typings";

declare module "obsidian" {
	interface Workspace extends BaseWorkspace {
		on(
			name: "better-properties:file-property-menu",
			callback: (menu: Menu, property: string) => void,
			ctx?: unknown
		): EventRef;

		on(
			name: "better-properties:property-label-width-change",
			callback: (newWidth: number | undefined) => void
		): EventRef;

		// trigger(
		// 	name: "better-properties:property-label-width-change",
		// 	width: number | undefined
		// ): void;
	}

	interface AbstractInputSuggest<T> extends PopoverSuggest<T> {
		showSuggestions: (suggestions: T[]) => void;
	}

	interface MarkdownPreviewRenderer {
		onHeadingCollapseClick(e: MouseEvent, el: HTMLElement): void;
	}

	interface MetadataTypeManager extends BaseMetadataTypeManager {
		registeredTypeWidgets: Record<string, PropertyWidget<unknown>>;
	}

	interface PropertyValueComponent {
		containerEl: HTMLElement;
		focus(_: unknown): void;
	}

	// interface MetadataEditor extends BaseMetadataEditor {
	// 	constructor(app: App, owner: Editor);
	// }
}
