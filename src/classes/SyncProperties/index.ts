import {
	App,
	ButtonComponent,
	ExtraButtonComponent,
	Modal,
	Setting,
	SettingTab,
	TFile,
} from "obsidian";
import { ConfirmationModal } from "../ConfirmationModal";
import { FolderSuggest } from "../FolderSuggest";
import { stat } from "fs";
import BetterProperties from "@/main";
import { FileSuggest } from "../FileSuggest";
import { findKeyInsensitive } from "@/libs/utils/pure";
import { getFirstLinkPathDest } from "@/libs/utils/obsidian";
import { PropertySuggest } from "../PropertySuggest";

// type BaseSource<T extends Record<string, unknown>> = {
// 	display: string;
// 	state: T;
// } & Record<string, unknown>;

// const selectedSource: BaseSource<{ notePath: string }> = {
// 	display: "Select a note",
// 	state: {
// 		notePath: "",
// 	},
// };

// const activeNoteSource: BaseSource<{}> = {
// 	display: "Active note",
// 	state: {},
// };

// const linkedInActiveSource: BaseSource<{ propertyName: string }> = {
// 	display: "Linked in active note",
// 	state: {
// 		propertyName: "",
// 	},
// };

// const sourceOptions = {
// 	selected: selectedSource,
// 	activeNote: activeNoteSource,
// 	linkedInActive: linkedInActiveSource,
// } as const;

abstract class BaseSource<T extends Record<string, unknown>> {
	constructor(protected app: App, protected state: T) {}

	updateState<K extends keyof T>(key: K, value: T[K]): void {
		this.state[key] = value;
	}

	abstract getNote(syncModal: SynchronizeModal): TFile | null;
	abstract renderSettings(container: HTMLElement): void;
}

type SelectSourceState = {
	notePath: string;
};
class SelectSource extends BaseSource<SelectSourceState> {
	getNote(): TFile | null {
		const {
			app: { vault },
			state: { notePath },
		} = this;
		if (!notePath) return null;
		return vault.getFileByPath(notePath);
	}

	renderSettings(container: HTMLElement): void {
		const {
			app,
			state: { notePath },
		} = this;

		container.empty();
		new Setting(container)
			.setName("Note path")
			.setDesc("Enter the path to the note.")
			.addSearch((cmp) => {
				cmp.setValue(notePath);
				cmp.onChange((v) => this.updateState("notePath", v));
				new FileSuggest(app, cmp);
			});
	}
}

type ActiveSourceState = {};
class ActiveSource extends BaseSource<ActiveSourceState> {
	getNote(syncModal: SynchronizeModal): TFile | null {
		return syncModal.activeFile;
	}

	renderSettings(container: HTMLElement): void {
		container.empty();
	}
}

type LinkedSourceState = {
	propertyName: string;
};
class LinkedSource extends BaseSource<LinkedSourceState> {
	getNote(syncModal: SynchronizeModal): TFile | null {
		const {
			app: { metadataCache },
			state: { propertyName },
		} = this;
		const { activeFile } = syncModal;
		if (!propertyName || !activeFile) return null;

		const mc = metadataCache.getFileCache(activeFile);
		if (!mc?.frontmatter) return null;
		const key = findKeyInsensitive(propertyName, mc.frontmatter);
		if (!key || !mc.frontmatter[key]) return null;
		const value = mc.frontmatter[key];
		return getFirstLinkPathDest(metadataCache, activeFile.path, value);
	}

	renderSettings(container: HTMLElement): void {
		container.empty();

		new Setting(container)
			.setName("Property name")
			.setDesc("The property containing a link to the note to be used.")
			.addSearch((cmp) => {
				cmp.setValue(this.state.propertyName);
				cmp.onChange((v) => this.updateState("propertyName", v));
				new PropertySuggest(this.app, cmp);
			});
	}
}

type SourceOptionState =
	| ActiveSourceState
	| SelectSourceState
	| LinkedSourceState;

type SourceStateOwner = {
	active: ActiveSourceState;
	select: SelectSourceState;
	linked: LinkedSourceState;
};

type SourceType = keyof SourceStateOwner;
type SourceOptions = ReturnType<typeof initSourceOptions>;

type InitSourceOptions = (
	app: App,
	stateOwner: SourceStateOwner
) => Record<keyof SourceStateOwner, BaseSource<SourceOptionState>>;
const initSourceOptions: InitSourceOptions = (app, stateOwner) => ({
	active: new ActiveSource(app, stateOwner.active),
	select: new SelectSource(app, stateOwner.select),
	linked: new LinkedSource(app, stateOwner.linked),
});

const sourceOptionDetails: Record<SourceType, string> = {
	select: "Select a note",
	active: "Active note",
	linked: "Linked in active note",
};

abstract class ConstraintCategory<T extends Record<string, unknown>> {
	private rowSetting: Setting;
	private itemContainer: HTMLElement;
	private addItemButton!: ExtraButtonComponent;
	private items: T[] = [];

	constructor(private container: HTMLElement, displayName: string) {
		this.rowSetting = new Setting(container).setName(displayName);
		this.itemContainer = container.createDiv();
		new Setting(container).addExtraButton((cmp) => {
			cmp.setIcon("plus").setTooltip("new item");
			this.addItemButton = cmp;
		});
	}

	protected abstract defaultItem: T;

	getItem(index: number): T | undefined {
		return this.items[index];
	}

	/**
	 * Create's a new item and returns its index
	 */
	createItem(): number {
		const len = this.items.push({ ...this.defaultItem });
		return len - 1;
	}

	updateItem<K extends keyof T>(index: number, key: K, value: T[K]): void {
		const item = this.getItem(index);
		if (!item) return;
		item[key] = value;
	}
}

type FolderItem = {
	allowed: boolean;
	folderPath: string;
	subfolders: boolean;
};
class FolderConstraint extends ConstraintCategory<FolderItem> {
	protected defaultItem: FolderItem = {
		allowed: true,
		folderPath: "",
		subfolders: false,
	};
}

type SynchronizeModalForm = {
	sourceType: keyof SourceOptions;
	sourceState: SourceStateOwner;
};

export class SynchronizeModal extends ConfirmationModal {
	private sourceInstances: ReturnType<typeof initSourceOptions>;
	private form: SynchronizeModalForm = {
		sourceType: "active",
		sourceState: {
			active: {},
			select: { notePath: "" },
			linked: { propertyName: "" },
		},
	};
	constructor(
		private plugin: BetterProperties,
		public activeFile: TFile | null
	) {
		super(plugin.app);
		this.sourceInstances = initSourceOptions(plugin.app, this.form.sourceState);
	}

	onOpen(): void {
		const { contentEl, activeFile, form } = this;
		contentEl.empty();
		this.setTitle("Synchronize properties");
		const p = contentEl.createDiv({
			cls: "better-properties-sync-properties-modal-active-file-container",
		});
		p.createEl("b", { text: "Active note: " });
		p.createSpan({ text: activeFile?.path ?? "no active note" });

		new Setting(contentEl).setHeading().setName("Source note");

		new Setting(contentEl)
			.setName("Method")
			.setDesc("How to determine the source note.")
			.then((s) => {
				const container = contentEl.createDiv();
				s.addDropdown((cmp) => {
					Object.entries(sourceOptionDetails).forEach(([v, d]) =>
						cmp.addOption(v, d)
					);
					cmp.setValue(form.sourceType);
					cmp.onChange((v) => {
						const op = v as SourceType;
						this.form.sourceType = op;
						this.sourceInstances[op].renderSettings(container);
					});
				});

				this.sourceInstances[form.sourceType].renderSettings(container);
			});

		// TODO for target notes, do a similar thing like with sources using a state initiator and owner

		this.createFooterButton((cmp) => {
			cmp.setButtonText("get form data").onClick(() => {
				const modal = new Modal(this.app);
				const { contentEl } = modal;
				contentEl.empty();
				modal.setTitle("Form data");
				contentEl
					.createEl("pre")
					.createEl("code", { text: JSON.stringify(this.form, undefined, 2) });
				modal.open();
			});
		});

		this.createFooterButton((cmp) => {
			cmp.setCta().setButtonText("synchronize");
		});
	}
}
