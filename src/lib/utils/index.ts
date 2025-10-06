import {
	CachedMetadata,
	DataWriteOptions,
	FileManager,
	getIconIds,
	MetadataCache,
	Notice,
	TFile,
	Vault,
} from "obsidian";
import BetterProperties from "~/main";
import { BetterPropertiesSettings } from "~/Plugin/settings";

export type Satisfies<Constraint, Type> = Type extends Constraint
	? Type
	: never;

export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type NonNullishObject<T> = T extends Record<string, unknown>
	? {
			[P in keyof T]-?: NonNullable<NonNullishObject<T[P]>>;
	  }
	: NonNullable<T>;

export type Optional<T extends Record<string, unknown>> = {
	[K in keyof T]?: T[K];
} & Record<string, unknown>;

export type NestedPaths<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends Record<string, any>
		? `${Prefix}${K}` | NestedPaths<T[K], `${Prefix}${K}.`>
		: `${Prefix}${K}`;
}[keyof T & string];

export type TryCatchResult<T> =
	| {
			success: true;
			data: T;
			error: undefined;
	  }
	| {
			success: false;
			data: undefined;
			error: string;
	  };

export const tryCatch = async <T>(
	toTry: Promise<T> | (() => Promise<T> | T)
): Promise<TryCatchResult<T>> => {
	try {
		const data = typeof toTry === "function" ? await toTry() : await toTry;
		return { success: true, data, error: undefined };
	} catch (e) {
		const error =
			e instanceof Error
				? e.message
				: typeof e === "string"
				? e
				: e?.toString
				? e.toString()
				: "Unknown error";
		return { success: false, data: undefined, error };
	}
};

export const syncTryCatch = <T>(toTry: () => T): TryCatchResult<T> => {
	try {
		const data = toTry();
		return { success: true, data, error: undefined };
	} catch (e) {
		const error =
			e instanceof Error
				? e.message
				: typeof e === "string"
				? e
				: e?.toString
				? e.toString()
				: "Unknown error";
		return { success: false, data: undefined, error };
	}
};

// export const getPropertyType = (app: App, property: string): string => {
// 	const lower = property.toLowerCase();
// 	const found = Object.values(app.metadataTypeManager.properties).find(
// 		({ name }) => lower === name.toLowerCase()
// 	);
// 	return found?.widget ?? "unset";
// };

/**
 * Returns a number or the min or max if it's out of bounds.
 *
 * Is inclusive with min and max by default.
 */
export const clampNumber = (
	num: number,
	min: number,
	max: number,
	nonInclusive?: boolean
) => {
	const underMin = nonInclusive ? num < min : num <= min;
	if (underMin) return min;
	const overMax = nonInclusive ? num > max : num >= max;
	if (overMax) return max;
	return num;
};

/**
 * Move an item in an array from one index to another
 * @remark You are responsible for ensuring the indexes are valid
 * @tutorial
 * ```ts
 * const arr = ['a', 'b', 'c', 'd'];
 * const newArr = arrayMove(arr, 1, 3);
 * // ['a', 'c', 'd', 'c']
 * ```
 */
export const arrayMove = <T>(arr: T[], from: number, to: number) => {
	const copy = [...arr];
	const item = copy[from];
	copy.splice(from, 1);
	copy.splice(to, 0, item);
	return copy;
};

/**
 * Improved version of built-in `MetadataCache.getLinkPathDest()`.
 *
 * ---
 * - [x] Text may or may not contain brackets
 * - [ ] Support for internal markdown links
 * - [ ] Support for external markdown links
 */
export const getFirstLinkPathDest = (
	mc: MetadataCache,
	originPath: string,
	text: string
) => {
	const noBrackets =
		text.startsWith("[[") && text.endsWith("]]") ? text.slice(2, -2) : text;

	const sectionCharIndex = noBrackets.indexOf("#");
	const noSectionLink =
		sectionCharIndex === -1
			? noBrackets
			: noBrackets.slice(0, sectionCharIndex);

	const aliasCharIndex = noSectionLink.indexOf("|");
	const noAlias =
		aliasCharIndex === -1
			? noSectionLink
			: noSectionLink.slice(0, aliasCharIndex);

	return mc.getFirstLinkpathDest(noAlias, originPath);
};

/**
 * Run a callback on every markdown file with its cached metadata
 */
export const iterateFileMetadata = ({
	vault,
	metadataCache,
	callback,
}: {
	vault: Vault;
	metadataCache: MetadataCache;
	callback: (data: {
		file: TFile;
		metadata: CachedMetadata | undefined;
	}) => void;
}) => {
	const files = vault.getMarkdownFiles();
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const hash = metadataCache.fileCache[file.path]?.hash;
		const metadata = hash ? metadataCache.metadataCache[hash] : undefined;
		callback({ file, metadata });
	}
};

export const iterativelyProcessFrontmatter = async ({
	fileManager,
	vault,
	process,
	afterProcess,
}: {
	fileManager: FileManager;
	vault: Vault;
	process: (fm: Record<string, unknown> | undefined) => void;
	afterProcess: (result: Awaited<TryCatchResult<void>>) => void | Promise<void>;
}) => {
	const files = vault.getMarkdownFiles();
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const result = await tryProcessFrontmatter({
			file,
			fileManager,
			process,
		});
		await afterProcess(result);
	}
};

/**
 * Atomically read, modify, and save the frontmatter of a note. The frontmatter is passed in as a JS object, and should be mutated directly to achieve the desired result.
 * @see FileManager['processFrontMatter']
 */
export const tryProcessFrontmatter = async ({
	file,
	fileManager,
	process,
	options,
}: {
	file: TFile;
	fileManager: FileManager;
	process: (fm: Record<string, unknown> | undefined) => void;
	options?: DataWriteOptions;
}): Promise<TryCatchResult<void>> => {
	return await tryCatch(fileManager.processFrontMatter(file, process, options));
};

/**
 * Finds a key in an object case-insensitively
 */
export const findKey = (
	obj: Record<string, unknown>,
	key: string
): string | null => {
	const lower = key.toLowerCase();
	const found = Object.keys(obj).find((k) => k.toLowerCase() === lower);
	return found ?? null;
};

/**
 * Case-insensitively delete a property's configurations in this plugin's settings
 */
export const deletePropertyConfiguration = async ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	await plugin.updateSettings((settings) => {
		if (!settings) return settings;
		const key = findKey(settings, property);
		if (!key) return settings;
		delete settings[key as keyof BetterPropertiesSettings];
		return settings;
	});
};

/**
 * Case-insensitively rename a property's configurations in this plugin's settings
 */
export const renamePropertyConfiguration = async ({
	plugin,
	property,
	newProperty,
}: {
	plugin: BetterProperties;
	property: string;
	newProperty: string;
}) => {
	await plugin.updateSettings((settings) => {
		const { propertySettings } = settings;
		if (!propertySettings) return settings;
		const key = findKey(propertySettings, property);
		if (!key) return settings;
		const config = { ...propertySettings[key] };
		delete propertySettings[key];
		const newKey = newProperty.toLowerCase();
		propertySettings[newKey] = config;
		return settings;
	});
};

/**
 * Delete's a property case-insensitively from all files' frontmatter and all associated plugin settings
 */
export const deleteProperty = async ({
	plugin,
	property,
}: {
	plugin: BetterProperties;
	property: string;
}) => {
	iterativelyProcessFrontmatter({
		fileManager: plugin.app.fileManager,
		vault: plugin.app.vault,
		process: (fm) => {
			if (!fm) return;
			const key = findKey(fm, property);
			if (!key) return;
			delete fm[key];
		},
		afterProcess: async ({ success, error }) => {
			if (success) {
				await deletePropertyConfiguration({ plugin, property });
				return;
			}
			const msg = "Better Properties: Error when deleting property";
			new Notice(
				createFragment((el) => {
					el.createDiv({ text: msg });
					el.createDiv({ text: error });
				}),
				0
			);
			console.error(msg + "\n" + error);
		},
	});
};

/**
 * Renames a property case-insensitively in all files' frontmatter and all associated plugin settings
 */
export const renameProperty = async ({
	plugin,
	property,
	newProperty,
}: {
	plugin: BetterProperties;
	property: string;
	newProperty: string;
}) => {
	const assignedType =
		plugin.app.metadataTypeManager.getAssignedWidget(property) ?? "text";
	plugin.app.metadataTypeManager.setType(newProperty, assignedType);
	plugin.app.metadataTypeManager.unsetType(property);
	iterativelyProcessFrontmatter({
		fileManager: plugin.app.fileManager,
		vault: plugin.app.vault,
		process: (fm) => {
			if (!fm) return;
			const key = findKey(fm, property);
			if (!key) return;
			const value = fm[key];
			if (Array.isArray(value)) {
				fm[newProperty] = [...value];
			}
			if (typeof value === "object") {
				fm[newProperty] = { ...value };
			}
			if (typeof value !== "object") {
				fm[newProperty] = value;
			}
			delete fm[key];
		},
		afterProcess: async ({ success, error }) => {
			if (success) {
				await renamePropertyConfiguration({ plugin, property, newProperty });
				return;
			}
			const msg = "Better Properties: Error when renaming property";
			new Notice(
				createFragment((el) => {
					el.createDiv({ text: msg });
					el.createDiv({ text: error });
				}),
				0
			);
			console.error(msg + "\n" + error);
		},
	});
};

/**
 * Get icon ids for use with the lib/types/icons.ts
 *
 * Use whenever updating the Obsidian version
 */
export const copyIcons = () => {
	const icons = getIconIds();
	const str = icons.reduce((acc, cur) => {
		const quoted = `"${cur}"`;
		if (!acc) return quoted;
		return acc + " | " + quoted;
	}, "");
	navigator.clipboard.writeText(str);
};

/**
 * Improved version of obsidian's `getAllTags()` function
 */
export const getAllTags = (
	/**	The metadata of a note */
	cachedMetadata: CachedMetadata,
	/** Whether to include a hashtag in the returned tags */
	includeHashTag: boolean
): string[] => {
	const tags = new Set<string>();

	cachedMetadata.tags?.forEach(({ tag }) => {
		// tags from note content should always have a hashtag
		const t = includeHashTag ? tag : tag.slice(1);
		tags.add(t);
	});

	const fmTags = cachedMetadata.frontmatter?.["tags"];
	if (!Array.isArray(fmTags)) {
		return Array.from(tags);
	}

	fmTags.forEach((tag) => {
		if (typeof tag !== "string") return;
		// frontmatter tags should never have a hashtag
		const t = includeHashTag ? "#" + tag : tag;
		tags.add(t);
	});

	return Array.from(tags);
};

/**
 * recreation of the collator that obsidian uses for sorting suggestions
 */
export const compareFunc = new Intl.Collator(undefined, {
	usage: "sort",
	sensitivity: "base",
	numeric: false,
}).compare;

/**
 * Adds event listeners to an element to make it draggable to reorder within a parent
 */
export const makeDraggable = ({
	itemEl,
	dragHandleEl,
	parentEl,
	itemsQuerySelector,
	onDragEnd,
}: {
	/**
	 * The element which is moved when dragged
	 */
	itemEl: HTMLElement;
	/**
	 * The element which is used to drag the item. Should be a child of `itemEl`
	 */
	dragHandleEl: HTMLElement;
	/**
	 * The element which contains `itemEl`
	 */
	parentEl: HTMLElement;
	/**
	 * The selector used to get all the other item elements in `parentEl`
	 */
	itemsQuerySelector: string;
	/**
	 * Callback that runs after the dragged item is dropped. This callback should do some mechanism which triggers a re-render of the parent's items
	 * @param oldIndex The original index of `itemEl` before it was dragged and dropped
	 * @param newIndex The new index of `itemEl` after it has been dragged and dropped
	 * @returns
	 */
	onDragEnd: (oldIndex: number, newIndex: number) => void;
}) => {
	dragHandleEl.addEventListener("mousedown", (mousedownEvent) => {
		const dragGhostHiddenClass = "drag-ghost-hidden";
		const dragGhostEl = createDiv({ cls: "drag-reorder-ghost" });

		let isSetupDone = false;

		const { width, height, left, top } = itemEl.getBoundingClientRect();
		let otherItemElsPositions: {
			top: number;
			bottom: number;
			el: Element;
		}[] = [];

		let originalIndex = -1;
		let currentIndex = -1;

		const dragThreshold = 25;
		let hasDragged = false;

		const onMouseMove = (mousemoveEvent: MouseEvent) => {
			if (!hasDragged) {
				hasDragged =
					Math.abs(mousedownEvent.pageX - mousemoveEvent.pageX) >
						dragThreshold ||
					Math.abs(mousedownEvent.pageY - mousemoveEvent.pageY) > dragThreshold;
			}
			if (!hasDragged) return;
			if (!isSetupDone) {
				const itemElClone = itemEl.cloneNode(true);
				itemEl.classList.add(dragGhostHiddenClass);
				if (!(itemElClone instanceof HTMLElement)) {
					throw new Error("Cloned property element is not an HTMLElement");
				}
				itemElClone.classList.add("better-properties-draggable-item-clone");
				itemElClone.setCssProps({
					"--better-properties-width": width + "px",
					"--better-properties-height": height + "px",
				});
				dragGhostEl.appendChild(itemElClone);
				// TODO this centers cursor over icon, but native properties drag from the exact point the mouse went down
				dragGhostEl.setCssProps({
					"--better-properties-left": `calc(${left}px - var(--icon-size))`,
					"--better-properties-top": `calc(${top}px - var(--icon-size))`,
				});
				window.activeDocument.body.appendChild(dragGhostEl);
				window.activeDocument.body.classList.add("is-grabbing");
				isSetupDone = true;

				parentEl.querySelectorAll(itemsQuerySelector)?.forEach((el, i) => {
					if (el === itemEl) {
						originalIndex = i;
						currentIndex = i;
					}
					const { top, bottom } = el.getBoundingClientRect();
					otherItemElsPositions.push({ top, bottom, el });
				});
			}
			dragGhostEl.setCssProps({
				"--better-properties-transform": `translate(${
					mousemoveEvent.pageX - left
				}px, ${mousemoveEvent.pageY - top}px)`,
			});

			otherItemElsPositions.forEach(({ top, bottom, el }, i) => {
				const middle = (top + bottom) / 2;
				const shouldSwapUp = i < currentIndex && mousemoveEvent.pageY < middle;
				const shouldSwapDown =
					i > currentIndex && mousemoveEvent.pageY > middle;
				if (!shouldSwapUp && !shouldSwapDown) return;
				el.insertAdjacentElement(
					shouldSwapUp ? "beforebegin" : "afterend",
					itemEl
				);
				otherItemElsPositions = arrayMove(
					otherItemElsPositions,
					currentIndex,
					i
				);
				currentIndex = i;
			});
		};
		const onMouseUp = () => {
			dragGhostEl.remove();
			itemEl.classList.remove(dragGhostHiddenClass);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			window.activeDocument.body.classList.remove("is-grabbing");

			if (originalIndex === -1 || currentIndex === -1) return;
			onDragEnd(originalIndex, currentIndex);
		};
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	});
};

/**
 * Parse a CSV style string into a 2D array of strings
 * @param csv - The text to parse as a CSV
 * @param delimiter The column delimeter character. Default ","
 * @returns
 */
export const parseCsv = (csv: string, delimiter = ","): string[][] => {
	const rows: string[][] = [];
	let currentRow: string[] = [];
	let currentValue = "";
	let insideQuotes = false;

	for (let i = 0; i < csv.length; i++) {
		const char = csv[i];
		const nextChar = csv[i + 1];

		if (char === '"') {
			// escaped quote: add one and skip next
			if (insideQuotes && nextChar === '"') {
				currentValue += '"';
				i++;
				continue;
			}
			insideQuotes = !insideQuotes;
			continue;
		}
		if (char === delimiter && !insideQuotes) {
			currentRow.push(currentValue);
			currentValue = "";
			continue;
		}
		// end of row
		if (!insideQuotes && (char === "\n" || char === "\r")) {
			// skip \r in \r\n combos
			if (char === "\r" && nextChar === "\n") i++;
			currentRow.push(currentValue);
			rows.push(currentRow);
			currentRow = [];
			currentValue = "";
			continue;
		}

		currentValue += char;
	}

	// 🧹 Push last row if file doesn’t end with newline
	if (currentValue.length > 0 || currentRow.length > 0) {
		currentRow.push(currentValue);
		rows.push(currentRow);
	}

	return rows;
};
