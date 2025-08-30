import {
	App,
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

export type NonNullishObject<T> = {
	[K in keyof T]-?: NonNullable<T[K]>;
};

export type NestedPaths<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends Record<string, any>
		? `${Prefix}${K}` | NestedPaths<T[K], `${Prefix}${K}.`>
		: `${Prefix}${K}`;
}[keyof T & string];

export type TryCatchResult<T> = Promise<
	| {
			success: true;
			data: T;
			error: undefined;
	  }
	| {
			success: false;
			data: undefined;
			error: string;
	  }
>;

export const tryCatch = async <T>(
	toTry: Promise<T> | (() => Promise<T> | T)
): TryCatchResult<T> => {
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
}): TryCatchResult<void> => {
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
	cachedMetadata: CachedMetadata,
	includeHashTag: boolean
) => {
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
