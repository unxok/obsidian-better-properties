// All types in this file are for API changes in Obsidian ver 1.9+

import {
	PropertyWidget as BasePropertyWidget,
	MetadataTypeManager as BaseMetadataTypeManager,
	PropertyInfo as BasePropertyInfo,
	PropertyRenderContext as BasePropertyRenderContext,
} from "obsidian-typings";
import { Scope as BaseScope } from "obsidian";

declare module "obsidian" {
	interface PropertyWidget<T> extends BasePropertyWidget<T> {
		render(
			containerEl: HTMLElement,
			/**
			 * 1.9+ changed to `T`
			 */
			value: T,
			context: PropertyRenderContext
		): PropertyValueComponent;
	}

	interface Scope extends BaseScope {
		/**
		 * Not sure if it was actually 1.9 or earlier
		 */
		setTabFocusContainerEl(el: HTMLElement): void;

		/**
		 * @deprecated
		 */
		setTabFocusContainer(el: HTMLElement): never;
	}
}

declare module "obsidian-typings" {
	interface PropertyInfo extends BasePropertyInfo {
		/**
		 * @deprecated
		 * @see occurrences
		 */
		count: never;

		/**
		 * The number of notes that contain this property
		 * @remark used to be named `count`
		 */
		occurrences: number;

		/**
		 * @deprecated
		 * @see widget
		 */
		type: never;

		/**
		 * The type name of the corresponding type widget
		 * @remark used to be named `type`
		 */
		widget: string;
	}

	interface PropertyRenderContext extends BasePropertyRenderContext {
		/**
		 * @deprecated
		 */
		metadataEditor: never;
	}
}
