import BetterProperties from "@/main";
import { CachedMetadata, TFile } from "obsidian";
import { MetadataEditor } from "obsidian-typings";
import { ConfirmationModal } from "../ConfirmationModal";
import { text } from "@/libs/i18Next";

export const getTemplateID = (
	metaCache: CachedMetadata,
	plugin: BetterProperties
) => {
	const {
		settings: { templateIdName },
	} = plugin;

	const findLower = () => {
		const found = Object.keys(metaCache).find((key) => {
			key.toLowerCase() === templateIdName;
		});
		if (!found) return null;
		return metaCache[found as keyof typeof metaCache];
	};

	const id = metaCache?.frontmatter?.[templateIdName] ?? findLower();
	if (!id) {
		new Notice(text("notices.noTemplateId"));
		return;
	}
	if (Array.isArray(id)) {
		new Notice(text("notices.templateIdIsArray"));
		return;
	}
	const parsedId: string = id.toString();
	return parsedId;
};

export const doSync = async (
	// file: TFile,
	metaCache: CachedMetadata,
	plugin: BetterProperties,
	templateId: string
) => {
	const {
		settings: { templateIdName, templatePropertyName },
		app,
	} = plugin;

	const parsedId = templateId;

	const templateEntries = Object.entries(metaCache.frontmatter ?? {});

	const hashes = Object.entries(app.metadataCache.metadataCache)
		.map(([hash, metadata]) => {
			if (!metadata.frontmatter) return null;
			const exactMatch = metadata.frontmatter[templatePropertyName];
			if (
				exactMatch === parsedId ||
				(Array.isArray(exactMatch) && exactMatch.includes(parsedId))
			)
				return hash;
			// try to find case insensitively
			const isMatch = Object.entries(metadata.frontmatter).some(
				([prop, value]) => {
					const a =
						prop.toLowerCase() ===
						templatePropertyName.toLowerCase();
					const b1 = value === parsedId;
					const b2 = Array.isArray(value) && value.includes(parsedId);
					const b = b1 || b2;
					return a && b;
				}
			);
			return isMatch ? hash : null;
		})
		.filter((h) => h !== null);

	const fileHashMap = new Map<string, TFile>();

	Object.entries(app.metadataCache.fileCache).forEach(([path, { hash }]) => {
		const f = app.vault.getFileByPath(path);
		if (!f) return;
		fileHashMap.set(hash, f);
	});

	let count = 0;
	await Promise.all(
		hashes.map(async (hash) => {
			const f = fileHashMap.get(hash);
			if (!f) return;
			count++;
			await app.fileManager.processFrontMatter(f, (fm) => {
				templateEntries.forEach(([prop, val]) => {
					// don't add the template id property
					if (prop === templateIdName) return;
					// if already has property, skip
					if (
						fm.hasOwnProperty(prop) ||
						fm.hasOwnProperty(prop.toLowerCase())
					)
						return;
					fm[prop] = val;
					// TODO add flag to delete or keep props not in template
				});
			});
		})
	);

	new Notice("Synchronized properties with " + count + " notes.");
};

export class SyncPropertiesModal extends ConfirmationModal {
	plugin: BetterProperties;
	metadataEditor: MetadataEditor;
	// file: TFile;
	metaCache: CachedMetadata;
	templateId: string;
	constructor(
		plugin: BetterProperties,
		metadataeditor: MetadataEditor,
		// file: TFile,
		metaCache: CachedMetadata,
		templateId: string
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.metadataEditor = metadataeditor;
		// this.file = file;
		this.metaCache = metaCache;
		this.templateId = templateId;
	}

	onOpen(): void {
		const { contentEl, metaCache, plugin, templateId } = this;

		contentEl.empty();

		this.setTitle("Synchronize properties");

		contentEl.createEl("p", {
			text: "Synchronize this notes properties to others notes that match this note's property template id.",
		});
		contentEl.createEl("p", {
			text: "This will only add properties from the template, so additional properties in the target notes will be unaffected.",
		});
		this.createButtonContainer();
		this.createCheckBox({
			text: "Don't ask again",
			defaultChecked: !plugin.settings.showSyncTemplateWarning,
			onChange: async (b) =>
				plugin.updateSettings((prev) => ({
					...prev,
					showSyncTemplateWarning: !b,
				})),
		});
		this.createFooterButton((cmp) =>
			cmp.setButtonText("cancel").onClick(() => this.close())
		).createFooterButton((cmp) =>
			cmp
				.setButtonText("synchronize")
				.setCta()
				.onClick(async () => {
					await doSync(metaCache, this.plugin, templateId);
					this.close();
				})
		);
	}
}
