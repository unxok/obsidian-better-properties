import {
	Events,
	Workspace as BaseWorkspace,
	MetadataCache as BaseMetadataCache,
	BasesViewRegistration,
} from "obsidian";
import {
	MetadataTypeManager as BaseMetadataTypeManager,
	MetadataEditor as BaseMetadataEditor,
	PropertyEntryData,
	PropertyWidget,
	BasesView,
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

	interface PropertyValueComponent {
		containerEl: HTMLElement;
		private focus(_: unknown): void;
		onFocus(): void;
	}

	interface MetadataTypeManager extends BaseMetadataTypeManager {
		on(name: "changed", cb: (property: string) => void): EventRef;
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

	interface FilterWidgetWrapper {
		data: unknown;
		icon: string;
		type: string;
		equals(data: unknown): boolean;
		looseEquals(data: unknown): boolean;
		renderTo(containerEl: HTMLElement, data: unknown): void;
		keys(): string[];
		objectAccess(): void;
	}

	interface QueryController {
		mockContext: {
			cachedProps: Record<string, FilterWidgetWrapper>;
			cacheProps(): unknown;
		};

		getWidgetForIdent(identity: string): string;
	}
}

declare module "obsidian-typings" {
	interface BasesPluginInstance {
		registrations: Record<string, BasesViewRegistration>;

		getRegistration(name: string): BasesViewRegistration;
	}
}
