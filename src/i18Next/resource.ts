/****************************************************************/
/* Do not nest! Each key should correspond to one string value! */
/* This allows type safe getting of text                        */
/****************************************************************/

export type TranslationResource = {
	dontAskAgain: string;
	noValue: string;
	notices: {
		noFileMetadataEditor: string;
		noTemplateId: string;
		templateIdIsArray: string;
		syncronizeComplete: string;
		settingsCopied: string;
		invalidJSON: string;
		couldntLocateJsFile: string;
		copiedExportedJSON: string;
	};
	buttonText: {
		update: string;
		cancel: string;
		confirm: string;
		delete: string;
		rename: string;
		export: string;
		import: string;
		reset: string;
		resetToDefault: string;
		more: string;
		insertInline: string;
		insertBlock: string;
	};
	BetterPropertiesSettingTab: {
		settings: {
			confirmReset: {
				title: string;
				desc: string;
			};
			synchronization: {
				header: string;
				templatePropertyName: {
					title: string;
					desc: string;
				};
				templatePropertyId: {
					title: string;
					desc: string;
				};
				confirmSynchronize: {
					title: string;
					desc: string;
				};
			};
		};
	};
	metadataMoreOptionsMenu: {
		showHidden: string;
		syncProps: string;
	};
	augmentedPropertyMenu: {
		delete: {
			menuItemTitle: string;
			confirmationModal: {
				title: string;
				desc: string;
				warning: string;
			};
		};
		rename: {
			menuItemTitle: string;
			confirmationModal: {
				title: string;
				desc: string;
				warning: string;
				propertyNameSetting: {
					title: string;
					desc: string;
					error: string;
				};
			};
		};
		usedBy: {
			menuItemTitle: string;
		};
		settings: {
			menuItemTitle: string;
			modal: {
				title: string;
				resetModal: {
					title: string;
					desc: string;
				};
				importModal: {
					title: string;
					desc: string;
					note: string;
					setting: {
						title: string;
						desc: string;
						placeholder: string;
					};
				};
				general: {
					heading: string;
					hidden: {
						title: string;
						desc: string;
					};
					customIcon: {
						title: string;
						desc: string;
					};
					iconColor: {
						title: string;
						desc: string;
					};
					iconHoverColor: {
						title: string;
						desc: string;
					};
					labelColor: {
						title: string;
						desc: string;
					};
					valueTextColor: {
						title: string;
						desc: string;
					};
					includeDefaultSuggestions: {
						title: string;
						desc: string;
					};
					staticSuggestions: {
						title: string;
						desc: string;
					};
				};
				nonCustomizableType: {
					title: string;
					desc: string;
				};
			};
		};
		massUpdate: {
			menuItemTitle: string;
			modal: {
				title: string;
				desc: string;
				warning: string;
				includeAbsentSetting: {
					title: string;
					desc: string;
				};
				searchValueSetting: {
					title: string;
					desc: string;
				};
				newValueSetting: {
					title: string;
					desc: string;
				};
			};
		};
	};
	typeWidgets: {
		button: {
			name: string;
		};
		color: {
			name: string;
		};
		dropdown: {
			name: string;
			openNoteTooltip: string;
			settings: {
				options: {
					title: string;
					desc: string;
				};
				dynamicOptions: {
					title: string;
					desc: string;
					inlineJs: {
						title: string;
						placeholder: string;
					};
					fileJs: {
						title: string;
						placeholder: string;
					};
				};
			};
			createOption: {
				value: {
					placeholder: string;
					tooltip: string;
				};
				configModal: {
					title: string;
					settings: {
						labelSetting: {
							title: string;
							desc: string;
						};
						backgroundColorSetting: {
							title: string;
							desc: string;
						};
						textColorSetting: {
							title: string;
							desc: string;
						};
					};
				};
				moveUpTooltip: string;
				moveDownTooltip: string;
				configTooltip: string;
				removeTooltip: string;
			};
		};
		markdown: {
			name: string;
		};
		numberPlus: {
			name: string;
			expressionModal: {
				title: string;
				calculatedPrefix: string;
				expressionSetting: {
					title: string;
					desc: string;
				};
			};
			settings: {
				validateSetting: {
					title: string;
					desc: string;
				};
				minSetting: {
					title: string;
					desc: string;
				};
				maxSetting: {
					title: string;
					desc: string;
				};
				stepSetting: {
					title: string;
					desc: string;
				};
			};
		};
		slider: {
			name: string;
			settings: {
				minSetting: {
					title: string;
					desc: string;
				};
				maxSetting: {
					title: string;
					desc: string;
				};
				stepSetting: {
					title: string;
					desc: string;
				};
				showLabelsSetting: {
					title: string;
					desc: string;
				};
			};
		};
		stars: {
			name: string;
			settings: {
				overrideIconSetting: {
					title: string;
					desc: string;
				};
				countSetting: {
					title: string;
					desc: string;
				};
			};
		};
		toggle: {
			name: string;
		};
		progress: {
			name: string;
		};
		time: {
			name: string;
		};
		group: {
			name: string;
			addProperty: string;
			propertyAlreadyExists: string;
			settings: {
				headerTextSetting: {
					title: string;
					desc: string;
				};
				showIndentationLines: {
					title: string;
					desc: string;
				};
			};
		};
		js: {
			name: string;
		};
		text: {};
	};
	propertyEditor: {
		insertModal: {
			title: string;
			desc: string;
			settings: {
				propertyNameSetting: {
					title: string;
					desc: string;
				};
				filePathSetting: {
					title: string;
					desc: string;
				};
				cssClassSetting: {
					title: string;
					desc: string;
				};
			};
		};
		insertCommand: {
			name: string;
		};
	};
};
