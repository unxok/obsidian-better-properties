import { setIcon } from "obsidian";
import { InputSuggest, Suggestion } from "../InputSuggest";

type Data = {
	property: string;
	type: string;
	icon: string;
};

export class PropertySuggest extends InputSuggest<Data> {
	constructor(...props: ConstructorParameters<typeof InputSuggest>) {
		super(...props);
	}

	protected getSuggestions(query: string): Data[] | Promise<Data[]> {
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
