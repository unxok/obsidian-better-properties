import {
	Events,
	EventRef,
	PopoverSuggest,
	Workspace as BaseWorkspace,
	MetadataCache as BaseMetadataCache,
	BasesViewFactory,
	TFile,
} from "obsidian";
import {
	MetadataTypeManager as BaseMetadataTypeManager,
	MetadataEditor as BaseMetadataEditor,
	PropertyEntryData,
	PropertyWidget,
	ViewFactory,
} from "obsidian-typings";

declare module "obsidian" {
	interface Workspace extends BaseWorkspace {
		on(
			name: "better-properties:file-property-menu",
			callback: (menu: Menu, property: string, show: () => void) => void,
			ctx?: unknown
		): EventRef;

		on(
			name: "better-properties:property-label-width-change",
			callback: (newWidth: number | undefined) => void
		): EventRef;

		_activeEditor: BaseWorkspace["activeEditor"];
	}

	interface AbstractInputSuggest<T> extends PopoverSuggest<T> {
		// TODO open PR to obsidian-typings. Currently have to manually enter this in package
		showSuggestions: (suggestions: T[]) => void;
	}

	interface MarkdownPreviewRenderer {
		onHeadingCollapseClick(e: MouseEvent, el: HTMLElement): void;
	}

	interface PropertyValueComponent {
		containerEl: HTMLElement;
		focus(_: unknown): void;
		onFocus(): void;
	}

	interface MetadataTypeManager extends BaseMetadataTypeManager {
		on(name: "changed", cb: (property: string) => void): EventRef;
		registeredTypeWidgets: Record<string, PropertyWidget>;
	}

	interface MetadataCache extends BaseMetadataCache {
		on(
			name: "better-properties:relation-changed",
			cb: (data: {
				file: TFile;
				property: string;
				oldValue: string[];
				value: string[];
				relatedProperty: string;
			}) => void
		): EventRef;
		trigger(
			name: "better-properties:relation-changed",
			data: {
				file: TFile;
				property: string;
				oldValue: string[];
				value: string[];
				relatedProperty: string;
			}
		);
	}

	interface Menu {
		scrollEl: HTMLDivElement;
	}

	interface QueryController {
		getWidgetForIdent(identity: string): string;
		mockContext: {
			cacheProps(): unknown;
			cachedProps: Record<
				string,
				{
					icon: string;
				}
			>;
		};
	}
}

declare module "obsidian-typings" {
	interface BasesPluginInstance {
		getRegistration(name: string): {
			factory: BasesViewFactory;
		};
	}
}
