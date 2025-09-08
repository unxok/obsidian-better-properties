import { ValueComponent, setIcon } from "obsidian";
import { selectEmptyAttr } from "~/lib/constants";
import { Icon } from "~/lib/types/icons";

export class SelectComponent<Option> extends ValueComponent<string> {
	public options: Option[] = [];
	selectContainerEl: HTMLDivElement;
	selectEl: HTMLDivElement;

	private value: string = "";

	onChangeCallback: (value: string) => void = () => {};
	parseOptionToString: (option: Option) => string = () => {
		throw new Error("Method not implemented");
	};

	constructor(
		public containerEl: HTMLElement,
		isDeleteAllowed: boolean = true
	) {
		super();
		this.selectContainerEl = containerEl.createDiv({
			cls: "better-properties-select-container better-properties-select-option",
		});
		this.selectEl = this.selectContainerEl.createDiv({
			cls: "better-properties-select-input",
			attr: {
				tabindex: "0",
				contenteditable: "true",
				spellcheck: "false",
				role: "combobox",
			},
		});

		if (isDeleteAllowed) {
			const selectCloseEl = this.selectContainerEl.createSpan({
				cls: "better-properties-select-close",
			});
			setIcon(selectCloseEl, "lucide-x" satisfies Icon);
		}

		const commitValue = () => {
			const value = this.selectEl.textContent;

			// ensure value is valid
			if (
				value !== "" &&
				!this.options.some((v) => this.parseOptionToString(v) === value)
			) {
				console.log("revert");
				this.selectEl.textContent = this.value;
				return;
			}

			this.setValue(value);
			this.onChanged();
		};

		this.selectEl.addEventListener("blur", () => {
			commitValue();
		});

		this.selectEl.addEventListener("keydown", () => {
			this.selectContainerEl.removeAttribute(selectEmptyAttr);
		});

		this.selectEl.addEventListener("keyup", (e) => {
			if (e.key !== "Enter") return;
			commitValue();
			this.selectEl.blur();
		});

		this.containerEl.addEventListener("click", () => {
			this.selectEl.focus();
		});
	}

	addOptions(options: Option[]) {
		this.options = options;
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): this {
		this.value = value;
		this.selectEl.textContent = value;

		if (value === "") {
			this.selectContainerEl.setAttribute(selectEmptyAttr, "true");
			return this;
		}

		this.selectContainerEl.removeAttribute(selectEmptyAttr);
		return this;
	}

	onChange(cb: (value: string) => void): this {
		this.onChangeCallback = cb;
		return this;
	}

	onChanged() {
		this.onChangeCallback(this.value);
	}

	getStringFromOption(cb: (option: Option) => string): this {
		this.parseOptionToString = cb;
		return this;
	}
}
