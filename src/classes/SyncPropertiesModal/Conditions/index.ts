import {
	App,
	CachedMetadata,
	FrontMatterCache,
	stringifyYaml,
	TAbstractFile,
	TFile,
	TFolder,
} from "obsidian";
import {
	ActiveFileCondition,
	activeFileConditionOption,
	defaultActiveFileCondition,
} from "./ActiveFile";
import {
	FolderCondition,
	folderConditionOption,
	defaultFolderCondition,
} from "./Folder";
import {
	PropertyCondition,
	propertyConditionOption,
	defaultPropertyCondition,
} from "./Property";
import { TagCondition, tagConditionOption, defaultTagCondition } from "./Tag";

export type ToFileCondition =
	| FolderCondition
	| TagCondition
	| PropertyCondition
	| ActiveFileCondition;

export const conditionTypeOptions = [
	folderConditionOption,
	tagConditionOption,
	propertyConditionOption,
	activeFileConditionOption,
];

export const defaultConditions: Record<
	ToFileCondition["conditionType"],
	ToFileCondition
> = {
	folder: defaultFolderCondition,
	tag: defaultTagCondition,
	property: defaultPropertyCondition,
	activeFile: defaultActiveFileCondition,
};

type FolderRequirement = {
	enabled: boolean;
	allowed: string[];
	disallowed: string[];
};

type TagsRequirement = {
	enabled: boolean;
	allowed: string[];
	disallowed: string[];
};

type PropertiesRequirement = {
	enabled: boolean;
	allowed: { property: string; value: string }[];
	disallowed: { property: string; value: string }[];
};

type Requirements = {
	folder: FolderRequirement;
	tags: TagsRequirement;
	props: PropertiesRequirement;
};

type SyncOptions = {
	reorder: boolean;
	removeExtras: boolean;
};

export const parseFilesForRequirements = (
	app: App,
	reqs: Requirements,
	fromFile: TFile
) => {
	const foundFiles: string[] = [];
	app.vault.getMarkdownFiles().forEach((f) => {
		// ignore the from file
		if (f.path === fromFile.path) return;
		const metadata = app.metadataCache.getFileCache(f);

		const isFolderMet = doesFileMeetFolderRequirement(f, reqs.folder);
		const isTagsMet = doesFileMeetTagsRequirement(f, reqs.tags, metadata);
		const isPropsMet = doesFileMeetPropertiesRequirement(f, reqs.props, metadata); // prettier-ignore

		// ignore if not all requirements met
		if (!(isFolderMet && isTagsMet && isPropsMet)) return;

		foundFiles.push(f.path);
	});
};

export const syncFilesProperties = async (
	app: App,
	syncOptions: SyncOptions,
	sourceFile: TFile,
	targetFiles: TFile[]
) => {
	const sourceFm =
		app.metadataCache.getFileCache(sourceFile)?.frontmatter ?? {};
	const sourceFmKeys = new Set(Object.keys(sourceFm));
	await Promise.all(
		targetFiles.map(async (f) => {
			await app.fileManager.processFrontMatter(f, (fm) =>
				syncFrontmatter(syncOptions, fm, sourceFm, sourceFmKeys)
			);
			console.log("Processed: ", f.path);
		})
	);
};

const syncFrontmatter = async (
	{ reorder, removeExtras }: SyncOptions,
	fm: FrontMatterCache,
	sourceFm: FrontMatterCache,
	sourceFmKeys: Set<string>
) => {
	const extraKeys = Object.keys(fm).filter((k) => !sourceFmKeys.has(k));
	// add missing properties
	sourceFmKeys.forEach((key) => {
		if (fm.hasOwnProperty(key)) return;
		fm[key] = sourceFm[key];
	});

	if (reorder) {
		const newFm: Record<string, unknown> = {};
		sourceFmKeys.forEach((key) => {
			newFm[key] = fm[key];
		});
		extraKeys.forEach((key) => {
			newFm[key] = fm[key];
		});

		fm = { ...newFm };
	}

	if (removeExtras) {
		extraKeys.forEach((key) => {
			delete fm[key];
		});
	}
};

const doesFileMeetFolderRequirement = (f: TFile, req: FolderRequirement) => {
	if (!req.enabled) return true;

	let isReqMet = false;
	const isAllowed = req.allowed.some((path) => f.path.startsWith(path));
	const isDisallowed = req.disallowed.some((path) => f.path.startsWith(path));

	if (isAllowed) isReqMet = true;
	if (isDisallowed) isReqMet = false;

	return isReqMet;
};

const doesFileMeetTagsRequirement = (
	f: TFile,
	req: TagsRequirement,
	metadata: CachedMetadata | null
) => {
	if (!req.enabled) return true;
	if (!metadata) return false;

	const fmTags: string[] = metadata?.frontmatter?.tags ?? [];
	const bodyTags = metadata.tags?.map((t) => t.tag) ?? [];
	const tags = new Set([...fmTags, ...bodyTags]);

	let isReqMet = false;
	const hasAllowed = req.allowed.some((t) => tags.has(t));
	const hasDisallowed = req.disallowed.some((t) => tags.has(t));

	if (hasAllowed) isReqMet = true;
	if (hasDisallowed) isReqMet = false;

	return isReqMet;
};

const doesFileMeetPropertiesRequirement = (
	f: TFile,
	req: PropertiesRequirement,
	metadata: CachedMetadata | null
) => {
	if (!req.enabled) return true;
	if (!metadata) return false;

	const fm = metadata.frontmatter ?? {};

	let isReqMet = false;

	const doesPropEqualValue = ({
		property,
		value,
	}: PropertiesRequirement["allowed"][number]) => {
		if (!fm.hasOwnProperty(property)) return false;
		if (!value) return true;
		const normalValue = stringifyYaml(value);
		return normalValue === value;
	};

	const hasAllowed = req.allowed.some(doesPropEqualValue);
	const hasDisallowed = req.disallowed.some(doesPropEqualValue);

	if (hasAllowed) isReqMet = true;
	if (hasDisallowed) isReqMet = false;

	return isReqMet;
};
