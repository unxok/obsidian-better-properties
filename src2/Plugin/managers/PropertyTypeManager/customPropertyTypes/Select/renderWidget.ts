import { ComboboxComponent } from "#/classes/ComboboxComponent";
import { PropertySettings } from "../../schema";
import { CustomPropertyType } from "../../types";
import typeKey from "./type";
import { BetterProperties } from "#/Plugin";
import { Keymap, setIcon, setTooltip } from "obsidian";
import { getRandomColor } from "./utils";
import { getBaseOptions } from "./utils/getBaseOptions";
import { getFormulaOptions } from "./utils/getFormulaOptions";

type Settings = PropertySettings["types"][typeof typeKey];
type Option = Settings["manualOptions"][number];

export default (({ plugin, containerEl, data, context }) => {
	const getSettings = () =>
		plugin.propertyTypeManager.getPropertyTypeSettings(context.key, typeKey);
	const updateSettings = async (cb: (s: Settings) => Settings) => {
		await plugin.propertyTypeManager.updatePropertyTypeSettings(
			context.key,
			typeKey,
			cb
		);
	};

	const value = data?.toString() ?? "";
	const widgetContainerEl = containerEl.createDiv({
		cls: "better-properties--select-widget-container",
	});

	const cmp = new SelectCombobox(
		plugin,
		widgetContainerEl,
		getSettings,
		updateSettings
	)
		.setValue(value)
		.onChange((value) => {
			context.onChange(value);
		})
		.getOptions(async (query) => {
			const settings = getSettings();
			const opts: Option[] =
				settings.optionsType === "manual"
					? settings.manualOptions
					: settings.optionsType === "base-file" ||
					  settings.optionsType === "inline-base"
					? await getBaseOptions({ plugin, context, settings })
					: settings.optionsType === "formula"
					? getFormulaOptions({ plugin, context, settings })
					: [];

			if (!query) return opts;
			const lower = query.toLowerCase();
			return opts.filter((o) => o.value.toLowerCase().includes(lower));
		});

	let linkEl: HTMLElement | undefined = undefined;
	let xEl: HTMLElement | undefined = undefined;
	const updateClickableEl = (opt: Option) => {
		if (linkEl) {
			linkEl.remove();
		}
		if (xEl) {
			xEl.remove();
		}

		cmp.clickableEl.empty();

		if (opt.value === "" && !opt.label) {
			return;
		}

		cmp.clickableEl.textContent = opt.label ?? opt.value;
		xEl = cmp.controlEl.createDiv({ cls: "clickable-icon" });
		setIcon(xEl, "lucide-x");

		xEl.addEventListener("click", (e) => {
			e.preventDefault();
			cmp.empty(e);
			xEl?.remove();
		});

		cmp.controlEl.setCssProps({
			"--better-properties--select-background": opt.background ?? "",
		});

		if (!opt.value.startsWith("[[") || !opt.value.endsWith("]]")) {
			return;
		}

		const linktext = opt.value.slice(2, -2);

		if (!opt.label) {
			cmp.clickableEl.textContent = linktext;
		}

		linkEl = cmp.controlEl.createDiv({
			cls: "clickable-icon",
		});
		setIcon(linkEl, "lucide-file");
		setTooltip(linkEl, linktext);
		linkEl.addEventListener("click", async (e) => {
			await plugin.app.workspace.openLinkText(
				linktext,
				context.sourcePath,
				Keymap.isModEvent(e)
			);
		});
		cmp.controlEl.insertAdjacentElement("afterbegin", linkEl);
	};

	cmp.onSelect((opt) => {
		updateClickableEl(opt);
		cmp.controlEl.focus();
	});

	// update shown label on render
	void (async () => {
		cmp.clickableEl.textContent = value;
		const opts = await cmp.getOptionsCallback(value);
		const matched = opts.find((o) => o.value === value) ?? { value };
		updateClickableEl(matched);
	})();

	containerEl.addEventListener("click", (e) => {
		if (e.defaultPrevented || e.target === cmp.clickableEl) return;
		cmp.clickableEl.click();
	});

	cmp.controlEl.addEventListener("keydown", (e) => {
		if (e.key !== "Enter") return;
		cmp.clickableEl.click();
	});

	return {
		focus() {
			cmp.controlEl.focus();
		},
	};
}) satisfies CustomPropertyType["renderWidget"];

class SelectCombobox extends ComboboxComponent<Option, string> {
	constructor(
		plugin: BetterProperties,
		public parentEl: HTMLElement,
		public getSettings: () => Settings,
		public updateSettings: (cb: (s: Settings) => Settings) => Promise<void>
	) {
		super(plugin, parentEl, "");

		this.controlEl.classList.add("better-properties--select-badge");

		this.searchSuggest.onRenderSuggestion((opt, el) => {
			const titleEl = el.querySelector(".suggestion-title");
			if (!(titleEl instanceof HTMLElement)) return;
			titleEl.classList.add("better-properties--select-badge");
			if (!opt.background) return;
			titleEl.setCssProps({
				"--better-properties--select-background": opt.background,
			});
		});

		const { optionsType, manualAllowCreate } = getSettings();

		this.searchSuggest.getDefaultSuggestion = () => ({ value: "" });

		let setEmptyEl: HTMLElement | undefined = undefined;

		this.searchSuggest.onOpen(() => {
			if (setEmptyEl) setEmptyEl.remove();

			setEmptyEl = this.searchSuggest.addFooterItem({
				icon: "lucide-x",
				title: "Set value to empty",
				aux: "Alt + Enter",
				onClick: (e) => {
					// this.searchSuggest.canClose = true;
					// this.searchSuggest.close();
					// this.setValue("");
					// this.onChanged();
					this.empty(e);
				},
			});
		});

		const originalOnEnter = this.searchSuggest.onEnter.bind(this.searchSuggest);

		this.searchSuggest.onEnter = async (e) => {
			if (e.altKey && setEmptyEl) {
				this.empty(e);
				return;
			}

			await originalOnEnter(e);
		};

		if (optionsType === "manual" && manualAllowCreate) {
			this.searchSuggest.canCreate = (query, values) => {
				if (!query) return false;
				const lower = query.toLowerCase();
				const matched = values.find(
					(v) =>
						v.value.toLowerCase() === lower || v.label?.toLowerCase() === lower
				);
				return !matched;
			};

			this.onCreate(async (query, e) => {
				const opt: Option = {
					value: query,
					background: getRandomColor({
						plugin,
						options: getSettings().manualOptions,
					}),
				};
				this.searchSuggest.selectSuggestion(opt, e);
				await updateSettings((s) => ({
					...s,
					manualOptions: [...s.manualOptions, opt],
				}));
			});
		}

		this.parseSuggestion((opt) => {
			return {
				title: opt.label ?? opt.value,
				aux:
					opt.value === this.getValue()
						? window.createFragment((el) =>
								setIcon(el.createSpan(), "lucide-check")
						  )
						: undefined,
			};
		});

		this.getValueFromOption = (opt) => opt.value;
	}

	empty(e: MouseEvent | KeyboardEvent): void {
		this.searchSuggest.selectSuggestion({ value: "" }, e);
	}
}
