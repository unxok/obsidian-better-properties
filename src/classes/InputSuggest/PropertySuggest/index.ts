import { FuzzyMatch, FuzzySuggestModal, setIcon } from "obsidian";
import { InputSuggest, Suggestion } from "..";
import { getPropertyTypeSettings } from "~/CustomPropertyTypes";
import BetterProperties from "~/main";
import { Icon } from "~/lib/types/icons";

type Value = {
	name: string;
	icon: string;
};

export class PropertySuggest extends InputSuggest<Value> {
	constructor(
		public plugin: BetterProperties,
		textInputEl: HTMLDivElement | HTMLInputElement
	) {
		super(plugin.app, textInputEl);
	}
	protected getSuggestions(query: string): Value[] {
		const properties: Value[] = Object.values(
			this.app.metadataTypeManager.properties
		)
			.map(({ name, widget }) => {
				const icon =
					(getPropertyTypeSettings({
						plugin: this.plugin,
						property: name,
						type: "general",
					}).icon ||
						this.app.metadataTypeManager.getWidget(widget)?.icon) ??
					("lucide-file-question" satisfies Icon);
				return {
					name,
					icon,
				};
			})
			.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
		if (!query) return properties;
		const lower = query.toLowerCase();
		return properties.filter((property) =>
			property.name.toLowerCase().includes(lower)
		);
	}

	protected parseSuggestion({ name }: Value): Suggestion {
		return {
			title: name,
			icon: " ",
		};
	}

	renderSuggestion(value: Value, el: HTMLElement): void {
		super.renderSuggestion.call(this, value, el);

		const iconEl = el.querySelector(".suggestion-flair");
		if (!(iconEl instanceof HTMLElement)) return;
		setIcon(iconEl, value.icon);
	}
}

export class PropertySuggestModal extends FuzzySuggestModal<Value> {
	constructor(public plugin: BetterProperties) {
		super(plugin.app);
	}

	getItems(): Value[] {
		return Object.values(this.app.metadataTypeManager.properties)
			.map(({ name, widget }) => {
				const icon =
					(getPropertyTypeSettings({
						plugin: this.plugin,
						property: name,
						type: "general",
					}).icon ||
						this.app.metadataTypeManager.getWidget(widget)?.icon) ??
					("lucide-file-question" satisfies Icon);
				return {
					name,
					icon,
				};
			})
			.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
	}

	getItemText(item: Value): string {
		return item.name;
	}

	onChooseItem(_item: Value, _evt: MouseEvent | KeyboardEvent): void {
		throw new Error("Method not implemented");
	}

	renderSuggestion(item: FuzzyMatch<Value>, el: HTMLElement): void {
		super.renderSuggestion.call(this, item, el);
		el.empty();
		el.classList.add("mod-complex");
		el.createDiv({ cls: "suggestion-title" }).createDiv({
			cls: "suggestion-title",
			text: item.item.name,
		});
		setIcon(
			el
				.createDiv({ cls: "suggestion-aux" })
				.createSpan({ cls: "suggestion-flair" }),
			item.item.icon
		);
	}
}
