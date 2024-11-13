import {
	Menu,
	ProgressBarComponent,
	setIcon,
	Setting,
	SliderComponent,
} from "obsidian";
import { defaultPropertySettings, PropertySettings } from "@/PropertySettings";
import { CustomTypeWidget } from "..";
import { createSection } from "@/libs/utils/setting";
import { text } from "@/i18Next";
import { PropertyEntryData } from "obsidian-typings";

export const GroupWidget: CustomTypeWidget = {
	type: "group",
	icon: "braces",
	default: () => {},
	name: () => text("typeWidgets.group.name"),
	validate: (v) => typeof v === "object",
	render: (plugin, el, data, ctx) => {
		const {} = plugin.settings.propertySettings[data.key.toLowerCase()]?.[
			"group"
		] ?? {
			...defaultPropertySettings["group"],
		};
		const container = el.createDiv({
			cls: "better-properties-group-container",
		});
		const { value } = data;

		if (!value || typeof value !== "object") {
			return;
		}
		if (Array.isArray(value)) {
			return;
		}
		const valueObj = { ...value } as Record<string, unknown>;
		const keys = Object.keys(valueObj);

		console.log("group val: ", keys);

		container
			.createDiv({
				cls: "metadata-properties-heading",
			})
			.createDiv({ cls: "metadata-properties-title", text: data.key });

		const contentDiv = container.createDiv({
			cls: "metadata-content",
		});

		const propertiesDiv = contentDiv.createDiv({
			cls: "metadata-properties",
		});

		const generateNestedProp = (key: string, focus?: boolean) => {
			const val = valueObj[key];
			const dotKey = data.key + "." + key;
			const assignedType =
				plugin.app.metadataTypeManager.getAssignedType(dotKey);

			console.log("assigned: ", assignedType);
			// if (!assignedType) {
			// 	plugin.app.metadataTypeManager.setType(key, "text");
			// 	console.log("setting type");
			// 	return;
			// causes infinite re-rendering loop...
			// }
			const type = assignedType ?? "text";

			const widget = plugin.app.metadataTypeManager.registeredTypeWidgets[type];

			const propertyDiv = propertiesDiv.createDiv({
				cls: "metadata-property",
				attr: {
					"tabindex": "0",
					"data-property-key": dotKey,
					"data-property-type": type,
				},
			});

			const keyDiv = propertyDiv.createDiv({ cls: "metadata-property-key" });
			const iconSpan = keyDiv.createSpan({
				cls: "metadata-property-icon",
				attr: { "aria-disabled": "false" },
			});
			iconSpan.addEventListener("click", (e) => {
				new Menu()
					.addItem((item) => {
						const sub = item
							.setTitle("Property type")
							.setSection("property-type")
							.setSubmenu();
						Object.entries(
							plugin.app.metadataTypeManager.registeredTypeWidgets
						).forEach(([widgetKey, widgetVal]) => {
							if (
								widgetKey === "aliases" ||
								widgetKey === "tags" ||
								widgetKey === "cssClasses"
							)
								return;
							sub.addItem((item) =>
								item
									.setTitle(widgetVal.name())
									.setIcon(widgetVal.icon)
									.onClick(() =>
										plugin.app.metadataTypeManager.setType(
											dotKey,
											widgetVal.type
										)
									)
							);
						});
					})
					.showAtMouseEvent(e);
			});
			const typeIcon = widget.icon;
			setIcon(iconSpan, typeIcon);

			const keyInput = keyDiv.createEl("input", {
				type: "text",
				value: key,
				cls: "metadata-property-key-input",
				attr: {
					"autocapitalize": "none",
					"enterkeyhint": "next",
					"aria-label": key,
				},
			});

			if (focus) {
				console.log("should focus");
				keyInput.focus();
			}

			const updateKey = (e: Event) => {
				const ev = e as MouseEvent & { target: HTMLInputElement };
				const newKey = ev.target.value;
				const obj = { ...valueObj };
				if (!newKey) {
					delete obj[key];
					ctx.onChange(obj);
					return;
				}
				if (newKey === key) return;
				const lower = newKey.toLowerCase();
				if (keys.some((k) => k.toLowerCase() === lower)) {
					keyInput.value = key;
					new Notice(text("typeWidgets.group.propertyAlreadyExists"));
					return;
				}
				delete obj[key];
				obj[newKey] = val ?? "";
				ctx.onChange(obj);
				console.log("updated: ", obj);
				console.log(ctx.onChange);
			};

			keyInput.addEventListener("blur", updateKey);
			keyInput.addEventListener("keydown", (e) => {
				if (e.key !== "Enter") return;
				updateKey(e);
			});

			const valueDiv = propertyDiv.createDiv({
				cls: "metadata-property-value",
			});

			widget.render(
				valueDiv,
				{
					key,
					type,
					value: val,
					dotKey,
				} as PropertyEntryData<unknown>,
				{
					...ctx,
					onChange: (v) => {
						valueObj[key] = v;
						ctx.onChange({ ...valueObj });
					},
				}
			);
		};

		keys.forEach((k) => {
			generateNestedProp(k);
		});

		const addButtonDiv = contentDiv.createDiv({
			cls: "metadata-add-button text-icon-button",
			attr: {
				tabindex: "0",
			},
		});

		setIcon(addButtonDiv.createSpan({ cls: "text-button-icon" }), "plus");
		addButtonDiv.createSpan({
			cls: "text-button-label",
			text: text("typeWidgets.group.addProperty"),
		});

		addButtonDiv.addEventListener("click", () => generateNestedProp("", true));
	},
};

export const createGroupSettings = (
	el: HTMLElement,
	form: PropertySettings["group"],
	updateForm: <T extends keyof PropertySettings["group"]>(
		key: T,
		value: PropertySettings["group"][T]
	) => void
	// defaultOpen: boolean
) => {
	const { content } = createSection(el, "Progress", true);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.minSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.minSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.min.toString()).onChange((v) => {
	// 			const n = Number(v);
	// 			const num = Number.isNaN(n) ? 0 : n;
	// 			updateForm("min", num);
	// 		})
	// 	);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.maxSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.maxSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.max.toString()).onChange((v) => {
	// 			const n = Number(v);
	// 			const num = Number.isNaN(n) ? 0 : n;
	// 			updateForm("max", num);
	// 		})
	// 	);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.stepSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.stepSetting.desc"))
	// 	.addText((cmp) =>
	// 		cmp.setValue(form.step.toString()).onChange((v) => {
	// 			const n = Number(v);
	// 			const num = Number.isNaN(n) ? 0 : n;
	// 			updateForm("step", num);
	// 		})
	// 	);

	// new Setting(content)
	// 	.setName(text("typeWidgets.slider.settings.showLabelsSetting.title"))
	// 	.setDesc(text("typeWidgets.slider.settings.showLabelsSetting.desc"))
	// 	.addToggle((cmp) =>
	// 		cmp
	// 			.setValue(form.showLabels)
	// 			.onChange((b) => updateForm("showLabels", b))
	// 	);
};

interface AugmentedProgressComponent extends ProgressBarComponent {
	sliderEl: HTMLElement;
	getValuePretty(): string;
	showTooltip(): void;
	setDynamicTooltip(): void;
}
