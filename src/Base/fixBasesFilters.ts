import { around, dedupe } from "monkey-around";
import { Constructor } from "obsidian";
import { monkeyAroundKey, customPropertyTypePrefix } from "~/lib/constants";
import BetterProperties from "~/main";

export const fixBasesFilters = (plugin: BetterProperties) => {
	const basesPlugin = plugin.app.internalPlugins.getEnabledPluginById("bases");
	if (!basesPlugin) {
		throw new Error("Bases plugin not enabled");
	}
	const removePatch = around(basesPlugin, {
		getRegistration(old) {
			return dedupe(monkeyAroundKey, old, function (name) {
				// @ts-expect-error
				const that = this as typeof basesPlugin;
				// console.log("getRegistration, this: ", that);

				const registration = old.call(that, name);
				const removeRegistrationPatch = around(registration, {
					factory: (old) => {
						return dedupe(monkeyAroundKey, old, (controller, containerEl) => {
							// console.log("controller: ", controller);

							const removeControllerPatch = around(controller, {
								getWidgetForIdent(old) {
									return dedupe(monkeyAroundKey, old, function (identity) {
										// @ts-expect-error
										const that = this as typeof controller;
										const widget = old.call(that, identity);
										if (identity === "toggleTest") {
											// console.log("widget: ", widget);
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
