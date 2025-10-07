import {
	Modal,
	ButtonComponent,
	Plugin,
	MarkdownView,
	BasesView,
	BasesViewRegistration,
	QueryController,
	Constructor,
	FilterWidgetWrapper,
	ToggleComponent,
} from "obsidian";
import {
	BetterPropertiesSettings,
	betterPropertiesSettingsSchema,
	BetterPropertiesSettingsTab,
	getDefaultSettings,
} from "./settings";
import {
	registerCustomPropertyTypeWidgets,
	sortAndFilterRegisteredTypeWidgets,
	unregisterCustomPropertyTypeWidgets,
	wrapAllPropertyTypeWidgets,
} from "~/CustomPropertyTypes/register";
import {
	customizePropertyEditorMenu,
	patchMetadataEditor,
} from "~/MetadataEditor";
import {
	BasesPluginInstance,
	PropertyWidget,
	TypedWorkspaceLeaf,
	ViewType,
} from "obsidian-typings";
import { PropertySuggestModal } from "~/classes/InputSuggest/PropertySuggest";
import { showPropertySettingsModal } from "~/CustomPropertyTypes/settings";
import { patchMetadataCache } from "~/MetadataCache";
import * as v from "valibot";
import { openRenameModal } from "~/MetadataEditor/propertyEditorMenu/rename";
import { registerBpJsCodeProcessors } from "~/bpjs";
import { BpJsApi, setupBpJsListeners } from "~/bpjs/api";
import { patchMetadataTypeManager } from "~/MetadataTypeManager/patchMetadataTypeManager";
import { around, dedupe } from "monkey-around";
import { customPropertyTypePrefix, monkeyAroundKey } from "~/lib/constants";
import { Icon } from "~/lib/types/icons";

const BASES_VIEW_TYPE: string = "bases";

const test = (plugin: BetterProperties) => {
	const basesPlugin = plugin.app.internalPlugins.getEnabledPluginById("bases");
	if (!basesPlugin) {
		throw new Error("Bases plugin not enabled");
	}
	const removePatch = around(basesPlugin, {
		getRegistration(old) {
			return dedupe(monkeyAroundKey, old, function (name) {
				// @ts-expect-error
				const that = this as typeof basesPlugin;
				console.log("getRegistration, this: ", that);

				const registration = old.call(that, name);
				const removeRegistrationPatch = around(registration, {
					factory: (old) => {
						return dedupe(monkeyAroundKey, old, (controller, containerEl) => {
							console.log("controller: ", controller);

							const removeControllerPatch = around(controller, {
								getWidgetForIdent(old) {
									return dedupe(monkeyAroundKey, old, function (identity) {
										// @ts-expect-error
										const that = this as typeof controller;
										const widget = old.call(that, identity);
										if (identity === "toggleTest") {
											console.log("widget: ", widget);
										}
										if (widget !== "unknown") return widget;

										const assignedWidget =
											plugin.app.metadataTypeManager.getAssignedWidget(
												identity
											);
										if (!assignedWidget?.startsWith(customPropertyTypePrefix))
											return widget;
										return assignedWidget;
									});
								},
							});
							plugin.register(removeControllerPatch);

							const MockContext: typeof controller.mockContext =
								Object.getPrototypeOf(controller.mockContext);

							const removeMockContextPatch = around(MockContext, {
								cacheProps(old) {
									return dedupe(monkeyAroundKey, old, function () {
										// @ts-expect-error
										const that = this as typeof MockContext;
										const toReturn = old.call(that);

										try {
											Object.entries(that.cachedProps).forEach(
												([property, details]) => {
													if (details.icon !== "lucide-file-question") return;
													const widgetName =
														plugin.app.metadataTypeManager.getAssignedWidget(
															property
														);
													// console.log(property, widgetName);
													if (!widgetName?.startsWith(customPropertyTypePrefix))
														return;
													const widget =
														plugin.app.metadataTypeManager.getWidget(
															widgetName
														);
													// details.icon = widget.icon;
													const detailsConstructor = Object.getPrototypeOf(
														Object.getPrototypeOf(details)
													).constructor as Constructor<typeof details>;
													class Details extends detailsConstructor {
														// value = undefined;
														type = "text";
														constructor() {
															super();
															this.icon = widget.icon;
														}
													}

													that.cachedProps[property] = new Details();
													if (property === "toggleTest") {
														console.log(that.cachedProps[property]);
													}
												}
											);
										} catch (e) {
											console.error(e);
										}

										return toReturn;
									});
								},
							});
							plugin.register(removeMockContextPatch);

							return old(controller, containerEl);
						});
					},
				});
				plugin.register(removeRegistrationPatch);

				return registration;
			});
		},
	});

	plugin.register(removePatch);
};

class FilterPropertyTypeWidgetBase {
	icon: string = "lucide-file-question";
	type: string = "Any";

	constructor() {}

	toString(): string {
		return this.type;
	}

	equals(
		a?: FilterPropertyTypeWidgetBase,
		b?: FilterPropertyTypeWidgetBase
	): boolean {
		return a === b || !!(a && b && a.equals(b));
	}
}

export class BetterProperties extends Plugin {
	settings: BetterPropertiesSettings = getDefaultSettings();
	disabledTypeWidgets: Record<string, PropertyWidget> = {};
	codePrefix = "bpjs:"; // TODO make configurable
	isProxied: boolean = false;

	bpjsInstances: Set<BpJsApi> = new Set();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new BetterPropertiesSettingsTab(this));
		patchMetadataTypeManager(this);
		registerCustomPropertyTypeWidgets(this);
		wrapAllPropertyTypeWidgets(this);
		sortAndFilterRegisteredTypeWidgets(this);
		this.setupCommands();
		this.app.workspace.onLayoutReady(async () => {
			customizePropertyEditorMenu(this);
			patchMetadataEditor(this);
			patchMetadataCache(this);
			setupBpJsListeners(this);
			registerBpJsCodeProcessors(this);

			this.rebuildLeaves();
			test(this);
		});
		this.handlePropertyLabelWidth();
		this.registerEvent(
			this.app.vault.on("config-changed", () => {
				this.refreshPropertyEditors();
			})
		);
	}

	rebuildLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			leaf.rebuildView && leaf.rebuildView();
		});
	}

	refreshPropertyEditors(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			const me = leaf.view.metadataEditor;
			if (!me) return;
			leaf.rebuildView();
		});
	}

	setupCommands(): void {
		this.addCommand({
			id: "refresh-property-editors",
			name: "Refresh Property Editors",
			callback: () => {
				this.refreshPropertyEditors();
			},
		});
		this.addCommand({
			id: "rebuild-views",
			name: "Rebuild views",
			callback: () => {
				this.rebuildLeaves();
			},
		});
		this.addCommand({
			id: "open-property-settings",
			name: "Open property settings",
			callback: () => {
				const modal = new PropertySuggestModal(this);
				modal.onChooseItem = (item) => {
					modal.close();
					showPropertySettingsModal({
						plugin: this,
						property: item.name,
					});
				};
				modal.open();
			},
		});
		this.addCommand({
			id: "rename-property",
			name: "Rename property",
			callback: () => {
				const modal = new PropertySuggestModal(this);
				modal.onChooseItem = (item) => {
					modal.close();
					openRenameModal({
						plugin: this,
						property: item.name,
					});
				};
				modal.open();
			},
		});
	}

	handlePropertyLabelWidth(): void {
		this.updateSettings((prev) => ({
			...prev,
			defaultLabelWidth: document.body.getCssPropertyValue(
				"---metadata-label-width"
			),
		}));
		const updateDomMetadataLabelWidth = (width: number | undefined) => {
			document.body.setCssProps({
				"--metadata-label-width":
					width === undefined ? this.settings.defaultLabelWidth : width + "px",
			});
		};
		this.app.workspace.on(
			"better-properties:property-label-width-change",
			(propertyLabelWidth) => {
				updateDomMetadataLabelWidth(propertyLabelWidth);
				this.updateSettings((prev) => ({ ...prev, propertyLabelWidth }));
			}
		);
		updateDomMetadataLabelWidth(this.settings.propertyLabelWidth);
	}

	onunload(): void {
		unregisterCustomPropertyTypeWidgets(this);
		this.bpjsInstances.forEach((bpjs) => {
			bpjs.component.unload();
		});
	}

	async onExternalSettingsChange() {
		await this.loadSettings();
	}

	async loadSettings() {
		const loaded = await this.loadData();

		// no settings yet, use default
		if (!loaded) {
			this.settings = getDefaultSettings();
			return;
		}

		const parsed = v.safeParse(betterPropertiesSettingsSchema, loaded);
		// settings are valid, so use them
		if (parsed.success) {
			this.settings = parsed.output;
			return;
		}

		// settings invalid, warn user and offer options
		const msg0 = "Better Properties: Invalid plugin settings detected!";
		const msg1 =
			"This likely happened because you modified the plugin's settings.json file directly. If not, please open an issue on the plugin's github repository";
		console.error(msg0 + "\n" + msg1);
		console.error(parsed.issues);
		const modal = new Modal(this.app);
		modal.setTitle(msg0);
		modal.contentEl.createEl("p", { text: msg1 });
		modal.contentEl.createEl("p", {
			text: "You can also reset the plugin's settings entirely by clicking the button below.",
		});
		const btnContainer = modal.contentEl.createDiv({
			cls: "modal-button-container",
		});
		new ButtonComponent(btnContainer)
			.setWarning()
			.setButtonText("Reset settings")
			.onClick(() => {
				this.settings = getDefaultSettings();
			});

		modal.open();
		return;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async updateSettings(
		cb: (prev: BetterPropertiesSettings) => BetterPropertiesSettings
	): Promise<void> {
		const newSettings = cb(this.settings);
		this.settings = { ...newSettings };
		await this.saveSettings();
	}
}
