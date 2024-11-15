import { TranslationResource } from "../resource";

export const en: TranslationResource = {
	dontAskAgain: "Don't ask again",
	noValue: "No value",
	notices: {
		noFileMetadataEditor:
			"Better Properties: No file found for metadata editor.",
		noTemplateId: "Better Properties: No template ID found in current file.",
		templateIdIsArray:
			"Better Properties: Template ID is a list when it should be a single value.",
		syncronizeComplete: "Synchronized properties with {{noteCount}} notes.",
		settingsCopied: "Settings copied to clipboard.",
		invalidJSON: "Failed to parse JSON!",
		couldntLocateJsFile:
			'Better Properties: Could not locate JS file from "{{filePath}}".',
		copiedExportedJSON: "Copied property settings JSON.",
	},
	buttonText: {
		update: "Update",
		cancel: "Cancel",
		confirm: "Confirm",
		delete: "Delete",
		rename: "Rename",
		export: "Export",
		import: "Import",
		reset: "Reset",
		resetToDefault: "Reset to default",
		more: "More",
		insertInline: "Insert inline",
		insertBlock: "Insert block",
	},
	metadataMoreOptionsMenu: {
		showHidden: "Show hidden",
		syncProps: "Sync properties",
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
					note: "Warning: Any invalid values will be replaced with their default value. As well, this will immediately update the property's settings and cannot be undone!",
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
					includeDefaultSuggestions: {
						title: "Include default suggestions",
						desc: "Whether to include the default suggestions Obsidian would normally include in the suggestions popover.",
					},
					staticSuggestions: {
						title: "Static suggestions",
						desc: "A list of items to always show in the suggestions popover.",
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
					desc: "Manage the available options for this dropdown. Entering duplicate values may cause unexpected behavior.",
				},
				dynamicOptions: {
					title: "Dynamic options",
					desc: "Use JavaScript to dynamically generate options for this dropdown in addition to the ones listed above. You can either type your code here and/or specify a .js file. Your code should, at the top level, return an array of objects with a key for label and value which are both strings ({value: string; label: string}[]).",
					inlineJs: {
						title: "Inline JavaScript",
						placeholder: 'return [{value: "Apples"}, ...]',
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
				configModal: {
					title: "Configure option",
					settings: {
						labelSetting: {
							title: "Label",
							desc: "The label that is shown in the dropdown for this option.",
						},
						backgroundColorSetting: {
							title: "Background color",
							desc: "The background color of the dropdown when this option is selected. Enter any valid CSS color.",
						},
						textColorSetting: {
							title: "Text color",
							desc: "The text color of the dropdown when this option is selected. Enter any valid CSS color.",
						},
					},
				},
				moveDownTooltip: "Move option down",
				moveUpTooltip: "Move option up",
				configTooltip: "Configure",
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
		progress: {
			name: "Progress",
		},
		time: {
			name: "Time",
		},
		group: {
			name: "Group",
			addProperty: "Add property",
			propertyAlreadyExists: "Property already exists!",
			settings: {
				headerTextSetting: {
					title: "Header text",
					desc: "The text to display above the nested properties in this group. Leave blank to remove header entirely.",
				},
			},
		},
		js: {
			name: "JavaScript",
		},
		text: {},
	},
	propertyEditor: {
		insertModal: {
			title: "Insert property editor",
			desc: "Insert syntax into the editor to render an editable property value.",
			settings: {
				propertyNameSetting: {
					title: "Property name",
					desc: "The name of the frontmatter property to edit.",
				},
				filePathSetting: {
					title: "File path",
					desc: "The path to the file to update. Defaults to current file.",
				},
				cssClassSetting: {
					title: "CSS Class",
					desc: "The CSS class to set for the element. Separate multiple names with a space.",
				},
			},
		},
		insertCommand: {
			name: "Insert property editor",
		},
	},
};
