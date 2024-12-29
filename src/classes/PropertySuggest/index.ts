import { App, setIcon, SuggestModal, TFile } from "obsidian";
import { InputSuggest, Suggestion } from "../InputSuggest";

type Data = {
	property: string;
	type: string;
	icon: string;
};

export class PropertySuggest extends InputSuggest<Data> {
	private scopedFile: TFile | undefined;
	constructor(...props: ConstructorParameters<typeof InputSuggest>) {
		super(...props);
	}

	/**
	 * Use to scope property suggestions to only be those present in the current file
	 */
	scopeToFile(file: TFile | string) {
		const f =
			typeof file === "string" ? this.app.vault.getFileByPath(file) : file;
		if (!f) return;
		this.scopedFile = f;
	}

	private getScopedProperties(data: Data[]): Data[] {
		const {
			scopedFile,
			app: { metadataCache },
		} = this;
		if (!scopedFile) return data;
		const fileProps = metadataCache.getFileCache(scopedFile)?.frontmatter;
		if (!fileProps) return [];
		const filePropsArr = Object.keys(fileProps);
		return data.filter(({ property }) => filePropsArr.includes(property));
	}

	protected getSuggestions(query: string): Data[] | Promise<Data[]> {
		const {
			app: { metadataTypeManager },
			scopedFile,
		} = this;
		const props = Object.values(metadataTypeManager.getAllProperties());
		const arr = props.map((obj) => ({
			property: obj.name,
			type: obj.type,
			icon:
				metadataTypeManager.registeredTypeWidgets[obj.type]?.icon ??
				"file-question",
		}));
		const scoped = scopedFile ? this.getScopedProperties(arr) : arr;
		if (!query) return scoped;
		return scoped.filter((obj) => obj.property.includes(query));
	}

	protected parseSuggestion(value: Data): Suggestion {
		return {
			title: value.property,
			// note: value.type,
			icon: value.icon,
		};
	}

	protected onRenderSuggestion(
		value: Data,
		_contentEl: HTMLDivElement,
		_titleEl: HTMLDivElement,
		_noteEl?: HTMLDivElement,
		auxEl?: HTMLDivElement
	): void {
		// if (!auxEl) return;
		// setIcon(auxEl, value.icon);
	}

	selectSuggestion(value: Data, _evt: MouseEvent | KeyboardEvent): void {
		this.component.setValue(value.property);
		this.component.onChanged();
		this.close();
	}
}

export class NestedPropertySuggest extends PropertySuggest {
	constructor(
		public parentKey: string,
		...props: ConstructorParameters<typeof PropertySuggest>
	) {
		super(...props);
	}

	protected getSuggestions(query: string): Data[] | Promise<Data[]> {
		const { metadataTypeManager } = this.app;
		const { parentKey } = this;
		const props = Object.values(metadataTypeManager.getAllProperties());
		const filtered = props.filter(({ name }) => {
			const arr = name.split(parentKey + ".");
			if (arr.length === 2) return true;
			return false;
		});
		const arr = filtered.map((obj) => ({
			property: obj.name.split(parentKey + ".")[1],
			type: obj.type,
			icon:
				metadataTypeManager.registeredTypeWidgets[obj.type]?.icon ??
				"file-question",
		}));
		if (!query) return arr;
		return arr.filter((obj) => obj.property.includes(query));
	}
}

export class PropertySuggestModal extends SuggestModal<Data> {
	constructor(
		app: App,
		public onSelect: (
			data: Data,
			e: MouseEvent | KeyboardEvent
		) => void | Promise<void>
	) {
		super(app);
	}

	getSuggestions(query: string): Data[] | Promise<Data[]> {
		const { metadataTypeManager } = this.app;
		const props = Object.values(metadataTypeManager.getAllProperties());
		const arr = props.map((obj) => ({
			property: obj.name,
			type: obj.type,
			icon:
				metadataTypeManager.registeredTypeWidgets[obj.type]?.icon ??
				"file-question",
		}));
		if (!query) return arr;
		return arr.filter((obj) => obj.property.includes(query));
	}

	renderSuggestion(value: Data, el: HTMLElement): void {
		el.classList.add("mod-complex");
		el.createDiv({ cls: "suggestion-content" }).createDiv({
			text: value.property,
			cls: "suggestion-title",
		});

		setIcon(
			el
				.createDiv({ cls: "suggestion-aux" })
				.createDiv({ cls: "suggestion-flair" }),
			value.icon
		);
	}

	async onChooseSuggestion(
		value: Data,
		evt: MouseEvent | KeyboardEvent
	): Promise<void> {
		await this.onSelect({ ...value }, evt);
	}
}
