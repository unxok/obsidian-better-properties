import BetterProperties from "~/main";
import { CustomPropertyType } from "../types";
import {
	findKeyValueByDotNotation,
	getPropertyTypeSettings,
	updateNestedObject,
} from "../utils";
import { getFirstLinkPathDest, iterateFileMetadata } from "~/lib/utils";
import { TFile } from "obsidian";
import { typeKey } from ".";
import { customPropertyTypePrefix } from "~/lib/constants";

export const registerListeners: CustomPropertyType["registerListeners"] = (
	plugin: BetterProperties
) => {
	/**
	 * // TODO
	 * figure out how to make sure relations values are accurate on file startup and file creation.
	 * current problem is if there's a conflict, how do I determine which one should be preseverved? If I just loop through all files, then it's random (maybe based on alphabetical order but still) for which side of the conflict will be enforced. This is especially problematic if two tabs are open and rendered simultaneously on startup and have conflicting relations
	 */
	// plugin.registerEvent(
	// 	plugin.app.metadataCache.on(
	// 		"better-properties:relation-changed",
	// 		(data) => {
	// 			updateRelatedFiles(plugin, data);
	// 		}
	// 	)
	// );
};

const updateRelatedFiles = (
	plugin: BetterProperties,
	data: {
		file: TFile;
		property: string;
		oldValue: string[];
		value: string[];
		relatedProperty: string;
	}
) => {
	const { metadataCache, fileManager } = plugin.app;
	const { file, oldValue, value, relatedProperty } = data;
	const alias: string | undefined =
		metadataCache.getFileCache(file)?.frontmatter?.["aliases"]?.[0];
	const oldSet = new Set(oldValue);
	const newSet = new Set(value);
	const allSet = oldSet.union(newSet);

	allSet.forEach((linktext) => {
		const foundFile = getFirstLinkPathDest(metadataCache, file.path, linktext);
		if (!foundFile) return;

		if (oldSet.has(linktext) && newSet.has(linktext)) return;
		const isRemoved = oldSet.has(linktext) && !newSet.has(linktext);

		const sourceLinktext = fileManager.generateMarkdownLink(
			file,
			foundFile.path,
			undefined,
			alias
		);
		fileManager.processFrontMatter(foundFile, (fm) => {
			const relatedValue = findKeyValueByDotNotation(relatedProperty, fm).value;
			const parsedRelatedValue: string[] = Array.isArray(relatedValue)
				? relatedValue
				: [];

			const hasSourceLinktext = parsedRelatedValue.includes(sourceLinktext);
			if (isRemoved && !hasSourceLinktext) return;
			if (!isRemoved && hasSourceLinktext) return;
			updateNestedObject(
				fm,
				relatedProperty,
				isRemoved
					? parsedRelatedValue.filter((s) => s !== sourceLinktext)
					: [...parsedRelatedValue, sourceLinktext]
			);
		});
	});
};

class RelationSynManager {
	isWorking: boolean = false;
	transactionMap: Map<TFile, Transaction> = new Map();

	constructor(public plugin: BetterProperties) {}

	getRelationProperties(): string[] {
		const arr: string[] = [];
		Object.entries(this.plugin.app.metadataTypeManager.properties).forEach(
			([key, value]) => {
				if (value.widget !== customPropertyTypePrefix + typeKey) return;
				arr.push(key);
			}
		);
		return arr;
	}

	getTransactions(): void {
		const { plugin, transactionMap } = this;
		const { metadataCache, vault } = plugin.app;

		iterateFileMetadata({
			metadataCache,
			vault,
			callback: ({ file, metadata }) => {
				this.getRelationProperties().forEach((property) => {
					const value = metadata?.frontmatter?.[property];
					const parsedValue: string[] = Array.isArray(value) ? value : [];
					parsedValue.forEach((linktext) => {
						const linkedFile = getFirstLinkPathDest(
							metadataCache,
							file.path,
							linktext
						);
						if (!linkedFile) return;

						const { relatedProperty } = getPropertyTypeSettings({
							plugin,
							property,
							type: typeKey,
						});
						if (!relatedProperty) return;

						const relatedPropertyValue: unknown =
							metadataCache.getFileCache(linkedFile)?.frontmatter?.[
								relatedProperty
							];

						const isIncluded =
							Array.isArray(relatedPropertyValue) &&
							relatedPropertyValue.some((v) => {
								return (
									file ===
									getFirstLinkPathDest(metadataCache, linkedFile.path, v)
								);
							});

						if (isIncluded) return;

						if (linkedFile.stat.mtime < file.stat.mtime) {
							const existing = transactionMap.get(linkedFile);
							const propertyObj = existing?.properties?.[relatedProperty];
							if (propertyObj) {
								propertyObj.added.add(file);
								return;
							}
						}
					});
				});
			},
		});
	}
}

type Transaction = {
	file: TFile;
	properties: Record<
		string,
		{
			added: Set<TFile>;
			removed: Set<TFile>;
		}
	>;
};
