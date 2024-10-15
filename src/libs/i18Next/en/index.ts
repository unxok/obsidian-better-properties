import { TranslationResource } from "../resource";

export const en: TranslationResource = {
	dontAskAgain: "Don't ask again",
	noValue: "No value",
	notices: {
		noFileMetadataEditor:
			"Better Properties: No file found for metadata editor.",
		noTemplateId:
			"Better Properties: No template ID found in current file.",
		templateIdIsArray:
			"Better Properties: Template ID is a list when it should be a single value.",
		syncronizeComplete: "Synchronized properties with {{noteCount}} notes.",
		settingsCopied: "Settings copied to clipboard.",
		invalidJSON: "Invalid JSON!",
		couldntLocateJsFile:
			"Better Properties: Could not locate JS file from {{filePath}}",
	},
	buttonText: {
		update: "update",
		cancel: "cancel",
		confirm: "confirm",
		delete: "delete",
		rename: "rename",
		export: "export",
		import: "import",
		reset: "reset",
		resetToDefault: "reset to default",
	},
	BetterPropertiesSettingTab: {
		settings: {
			confirmReset: {
				title: "Confirm reset property settings",
				desc: "Whether you want to be prompted to confirm resetting a property's settings back to default.",
			},
			synchronization: {
				header: "Synchronization",
				templatePropertyName: {
					title: "Template property name",
					desc: "The property name that notes will use to indicate what their template is.",
				},
				templatePropertyId: {
					title: "Template property ID name",
					desc: "The property name that template notes will use to define their template identifier.",
				},
				confirmSynchronize: {
					title: "Confirm template synchronize",
					desc: "Whether you want to get prompted to confirm property synchronization.",
				},
			},
		},
	},
	augmentedPropertyMenu: {
		delete: {
			menuItemTitle: "Delete",
			confirmationModal: {
				title: "Delete property {{key}}",
				desc: "Delete this property from all notes that contain it.",
				warning:
					"Warning: This update is permanent and may affect many notes at once!",
			},
		},
		rename: {
			menuItemTitle: "Rename",
			confirmationModal: {
				title: "Rename property {{key}}",
				desc: "Rename this property for all notes that contain it.",
				warning:
					"Warning: This update is permanent and may affect many notes at once!",
				propertyNameSetting: {
					title: "New property name",
					desc: "The new name to rename the property to.",
					error: "Property name already in use!",
				},
			},
		},
		usedBy: {
			menuItemTitle: "Used by {{noteCount}} notes",
		},
		settings: {
			menuItemTitle: "Settings",
			modal: {
				title: "Settings for {{property}}",
				resetModal: {
					title: "Are you sure?",
					desc: "This will permanently reset all settings for this property back to the default. This cannot be undone!",
				},
				importModal: {
					title: "Import settings",
					desc: "All settings for all types are imported, so you may need to update this property's type still.",
					note: "This will immediately update the property's settings and cannot be undone!",
					setting: {
						title: "Settings JSON",
						desc: "Paste JSON for the new settings you would like to update this property to have.",
						placeholder: '{"general": {...}, ...}',
					},
				},
				nonCustomizableType: {
					title: "Non customizable type",
					desc: "The current type is not customizable by Better Properties",
				},
				general: {
					heading: "General",
					hidden: {
						title: "Hidden",
						desc: "Turn on to have this property be hidden from the properties editor by default.",
					},
					customIcon: {
						title: "Custom icon",
						desc: "Set a custom icon to override the default type icon for this property.",
					},
					iconColor: {
						title: "Icon color",
						desc: "Set a custom color for the type icon. Choose a color from the picker or enter any valid CSS color.",
					},
					iconHoverColor: {
						title: "Icon hover color",
						desc: "Set a custom color for the type icon when hovered. Choose a color from the picker or enter any valid CSS color.",
					},
					labelColor: {
						title: "Property label color",
						desc: "Set a custom color for the property name label. Choose a color from the picker or enter any valid CSS color.",
					},
					valueTextColor: {
						title: "Value text color",
						desc: "Set a custom color to override the default normal text color in the property value. Choose a color from the picker or enter any valid CSS color.",
					},
				},
			},
		},
		massUpdate: {
			menuItemTitle: "Mass update",
			modal: {
				title: "Mass update property {{key}}",
				desc: "Update this property's value for many notes at once.",
				warning:
					"Warning: This update is permanent and may affect many notes at once!",
				includeAbsentSetting: {
					title: "Include absent properties",
					desc: "If this is off and if the search value is empty/blank, Only notes that have the property present in their frontmatter will be updated.",
				},
				searchValueSetting: {
					title: "Search value",
					desc: "Only notes where the property's current value is this will be updated.",
				},
				newValueSetting: {
					title: "New value",
					desc: "The new value to update to.",
				},
			},
		},
	},
	typeWidgets: {
		button: {
			name: "Button",
		},
		color: {
			name: "Color",
		},
		dropdown: {
			name: "Dropdown",
			openNoteTooltip: "Open note",
			settings: {
				options: {
					title: "Options",
					desc: "Manage the available options for this dropdown. Value on the left will be what's saved to your note, and the Label on the right is what will be shown in the dropdown.",
				},
				dynamicOptions: {
					title: "Dynamic options",
					desc: "Use JavaScript to dynamically generate options for this dropdown in addition to the ones listed above. You can either type your code here and/or specify a .js file. Your code should, at the top level, return an array of objects with a key for label and value which are both strings ({value: string; label: string}[]).",
					inlineJs: {
						title: "Inline JavaScript",
						placeholder:
							'return [{value: "a", label: "Apples"}, {value: "b", label: "Bananas"}]',
					},
					fileJs: {
						title: "Load from *.js file",
						placeholder: "path/to/file.js",
					},
				},
			},
			createOption: {
				value: {
					placeholder: "Value",
					tooltip: "Value",
				},
				label: {
					placeholder: "Label (optional)",
					tooltip: "Label",
				},
				moveDownTooltip: "Move option down",
				moveUpTooltip: "Move option up",
				removeTooltip: "Remove option",
			},
		},
		markdown: {
			name: "Markdown",
		},
		numberPlus: {
			name: "Number+",
			expressionModal: {
				title: "Update by expression",
				calculatedPrefix: "Calculated: ",
				expressionSetting: {
					title: "Expression",
					desc: 'Enter a valid JavaScript expression. Use "x" for the current value.',
				},
			},
			settings: {
				validateSetting: {
					title: "Validate within bounds",
					desc: "If on, the number will be validated against the set min and max values prior to saving.",
				},
				minSetting: {
					title: "Min",
					desc: "If the validate toggle is on, this is the minimum number allowed for the input.",
				},
				maxSetting: {
					title: "Max",
					desc: "Will affect the width of the input. If the validate toggle is on, this is the minimum number allowed for the input.",
				},
				stepSetting: {
					title: "Step",
					desc: "The amount to input will be changed if the plus or minus buttons are clicked.",
				},
			},
		},
		slider: {
			name: "Slider",
			settings: {
				minSetting: {
					title: "Min",
					desc: "The minimum value the slider can reach.",
				},
				maxSetting: {
					title: "Max",
					desc: "The maximum value the slider can reach.",
				},
				stepSetting: {
					title: "Step",
					desc: "The smallest amount that the slider can be changed.",
				},
				showLabelsSetting: {
					title: "Show labels",
					desc: "If on, labels for the min & max will be shown.",
				},
			},
		},
		stars: {
			name: "Stars",
			settings: {
				overrideIconSetting: {
					title: "Override star icon",
					desc: "Set a custom icon to show in place of the default stars.",
				},
				countSetting: {
					title: "Count",
					desc: "How many stars to display.",
				},
			},
		},
		toggle: {
			name: "Toggle",
		},
	},
};
