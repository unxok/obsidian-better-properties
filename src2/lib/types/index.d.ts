import { Events, Workspace as BaseWorkspace } from "obsidian";
import {
	MetadataTypeManager as BaseMetadataTypeManager,
	MetadataEditor as BaseMetadataEditor,
	PropertyEntryData,
	PropertyWidget,
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

	// interface MetadataTypeManager extends BaseMetadataTypeManager {
	// 	registeredTypeWidgets: Record<string, PropertyWidget>;
	// }

	interface PropertyValueComponent {
		containerEl: HTMLElement;
		private focus(_: unknown): void;
		onFocus(): void;
	}

	// interface MetadataEditor extends BaseMetadataEditor {
	// 	constructor(app: App, owner: Editor);
	// }
}
