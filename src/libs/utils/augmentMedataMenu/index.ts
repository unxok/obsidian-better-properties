import { Menu } from "obsidian";
import BetterProperties from "@/main";
import { addDelete } from "./addDelete";
import { addRename } from "./addRename";
import { addUsedBy } from "./addUsedBy";
import { addSettings } from "./addSettings";
import { addMassUpdate } from "./addMassUpdate";

export type MetadataAddItemProps = {
	plugin: BetterProperties;
	menu: Menu;
	files: {
		path: string;
		hash: string;
		value: unknown;
	}[];
	key: string;
};

export { addDelete, addRename, addUsedBy, addSettings, addMassUpdate };
