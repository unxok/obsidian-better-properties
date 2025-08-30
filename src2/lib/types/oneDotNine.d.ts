// All types in this file are for API changes in Obsidian ver 1.9+

import {
	PropertyWidget as BasePropertyWidget,
	MetadataTypeManager as BaseMetadataTypeManager,
	PropertyInfo as BasePropertyInfo,
	PropertyRenderContext as BasePropertyRenderContext,
} from "obsidian-typings";
import { Scope as BaseScope } from "obsidian";

declare module "obsidian" {
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
	// interface PropertyInfo extends BasePropertyInfo {
	// 	/**
	// 	 * @deprecated
	// 	 * @see occurrences
	// 	 */
	// 	count: never;
	// 	/**
	// 	 * The number of notes that contain this property
	// 	 * @remark used to be named `count`
	// 	 */
	// 	occurrences: number;
	// 	/**
	// 	 * @deprecated
	// 	 * @see widget
	// 	 */
	// 	type: never;
	// 	/**
	// 	 * The type name of the corresponding type widget
	// 	 * @remark used to be named `type`
	// 	 */
	// 	widget: string;
	// }
	// interface PropertyRenderContext extends BasePropertyRenderContext {
	// 	/**
	// 	 * @deprecated
	// 	 */
	// 	metadataEditor: never;
	// }
	// interface PropertyWidget extends BasePropertyWidget {
	// 	render(
	// 		containerEl: HTMLElement,
	// 		/**
	// 		 * 1.9+ changed to `T`
	// 		 */
	// 		value: unknown,
	// 		context: PropertyRenderContext
	// 	): PropertyValueComponent;
	// }
	// interface App {
	// 	MetadataTypeManager: {
	// 		/**
	// 		 * @deprecated
	// 		 * @see getAssignedWidget
	// 		 */
	// 		getAssignedType(property: string): string | null;
	// 		/**
	// 		 * Gets the type name of the currently assigned type widget for the given property
	// 		 */
	// 		getAssignedWidget(property: string): string | null;
	// 	};
	// }
}
