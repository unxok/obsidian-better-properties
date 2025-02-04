import { CachedMetadata, TFile } from "obsidian";

export type FileItem = { file: TFile; metadata: CachedMetadata | null };

// type Filter = (file: TFile, metadata: CachedMetadata | null) => boolean;
export type Filter = {
	label: string;
} & (
	| (Pick<Field, "type" | "value"> & { operator: string })
	| {
			type: "custom";
			func: string;
	  }
);
// type Sorter = (a: FileItem, b: FileItem) => number;
export type Sorter = {
	asc: boolean;
	label: string;
} & (
	| Pick<Field, "type" | "value">
	| {
			type: "custom";
			func: string;
	  }
);
export type PropertyField = {
	type: "property";
	alias: string;
	colWidth?: number;
	value: string;
};

export const fileDataColumnValueOptions = [
	"file-link",
	"file-name",
	"file-path",
	"file-created",
	"file-modified",
	"file-size",
] as const;

export type FileDataField = {
	type: "fileData";
	alias: string;
	colWidth?: number;
	value: (typeof fileDataColumnValueOptions)[number];
};
export type TagsField = {
	type: "tags";
	alias: string;
	colWidth?: number;
	value: string;
};
export type EmbedField = {
	type: "embed";
	alias: string;
	colWidth?: number;
	value: string;
	embedType: "heading" | "block";
};
export type Field = PropertyField | FileDataField | TagsField | EmbedField;

export type BlockConfig = {
	fields: Field[];
	filters: Filter[];
	folder: string;
	excludedFolders: string[];
	sorter: Sorter;
	pageNumber: number;
	pageSize: number;
};

export type SaveBlockConfig = (b: BlockConfig) => Promise<void>;
