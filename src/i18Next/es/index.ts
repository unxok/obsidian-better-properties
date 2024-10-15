import { TranslationResource } from "../resource";

/***********************************/
/* NOT YET VERIFIED BY SPANISH SPEAKER */
/***********************************/

export const es: TranslationResource = {
	dontAskAgain: "No preguntar de nuevo",
	noValue: "Sin valor",
	notices: {
		noFileMetadataEditor:
			"Mejores Propiedades: No se encontró archivo para el editor de metadatos.",
		noTemplateId:
			"Mejores Propiedades: No se encontró ID de plantilla en el archivo actual.",
		templateIdIsArray:
			"Mejores Propiedades: El ID de la plantilla es una lista cuando debería ser un solo valor.",
		syncronizeComplete:
			"Propiedades sincronizadas con {{noteCount}} notas.",
		settingsCopied: "Configuración copiada al portapapeles.",
		invalidJSON: "¡Error al analizar JSON!",
		couldntLocateJsFile:
			'Mejores Propiedades: No se pudo localizar el archivo JS desde "{{filePath}}".',
		copiedExportedJSON:
			"Configuración de propiedades copiada en formato JSON.",
	},
	buttonText: {
		update: "actualizar",
		cancel: "cancelar",
		confirm: "confirmar",
		delete: "eliminar",
		rename: "renombrar",
		export: "exportar",
		import: "importar",
		reset: "restablecer",
		resetToDefault: "restablecer a los valores predeterminados",
		more: "Más",
	},
	metadataMoreOptionsMenu: {
		showHidden: "Mostrar ocultos",
		syncProps: "Sincronizar propiedades",
	},
	BetterPropertiesSettingTab: {
		settings: {
			confirmReset: {
				title: "Confirmar restablecimiento de configuración de propiedades",
				desc: "Si desea que se le pida confirmar antes de restablecer la configuración de una propiedad a los valores predeterminados.",
			},
			synchronization: {
				header: "Sincronización",
				templatePropertyName: {
					title: "Nombre de la propiedad de la plantilla",
					desc: "El nombre de la propiedad que usarán las notas para indicar cuál es su plantilla.",
				},
				templatePropertyId: {
					title: "Nombre del ID de la propiedad de la plantilla",
					desc: "El nombre de la propiedad que usarán las notas de plantilla para definir su identificador de plantilla.",
				},
				confirmSynchronize: {
					title: "Confirmar sincronización de plantilla",
					desc: "Si desea que se le pida confirmar la sincronización de las propiedades.",
				},
			},
		},
	},
	augmentedPropertyMenu: {
		delete: {
			menuItemTitle: "Eliminar",
			confirmationModal: {
				title: "Eliminar propiedad {{key}}",
				desc: "Eliminar esta propiedad de todas las notas que la contengan.",
				warning:
					"Advertencia: ¡Esta actualización es permanente y puede afectar muchas notas a la vez!",
			},
		},
		rename: {
			menuItemTitle: "Renombrar",
			confirmationModal: {
				title: "Renombrar propiedad {{key}}",
				desc: "Renombrar esta propiedad en todas las notas que la contengan.",
				warning:
					"Advertencia: ¡Esta actualización es permanente y puede afectar muchas notas a la vez!",
				propertyNameSetting: {
					title: "Nuevo nombre de la propiedad",
					desc: "El nuevo nombre al que se cambiará la propiedad.",
					error: "¡El nombre de la propiedad ya está en uso!",
				},
			},
		},
		usedBy: {
			menuItemTitle: "Usado por {{noteCount}} notas",
		},
		settings: {
			menuItemTitle: "Configuraciones",
			modal: {
				title: "Configuraciones para {{property}}",
				resetModal: {
					title: "¿Estás seguro?",
					desc: "Esto restablecerá permanentemente todas las configuraciones de esta propiedad a los valores predeterminados. ¡Esto no se puede deshacer!",
				},
				importModal: {
					title: "Importar configuraciones",
					desc: "Todas las configuraciones para todos los tipos se importarán, por lo que es posible que deba actualizar el tipo de esta propiedad.",
					note: "Advertencia: Cualquier valor no válido será reemplazado por su valor predeterminado. Además, esto actualizará inmediatamente la configuración de la propiedad y no se podrá deshacer.",
					setting: {
						title: "Configuraciones JSON",
						desc: "Pega el JSON con las nuevas configuraciones que deseas que esta propiedad tenga.",
						placeholder: '{"general": {...}, ...}',
					},
				},
				nonCustomizableType: {
					title: "Tipo no personalizable",
					desc: "El tipo actual no es personalizable por Mejores Propiedades",
				},
				general: {
					heading: "General",
					hidden: {
						title: "Oculto",
						desc: "Activar para que esta propiedad esté oculta en el editor de propiedades por defecto.",
					},
					customIcon: {
						title: "Icono personalizado",
						desc: "Establece un icono personalizado para reemplazar el icono predeterminado del tipo de esta propiedad.",
					},
					iconColor: {
						title: "Color del icono",
						desc: "Establece un color personalizado para el icono del tipo. Elige un color del selector o introduce cualquier color CSS válido.",
					},
					iconHoverColor: {
						title: "Color de icono al pasar el ratón",
						desc: "Establece un color personalizado para el icono del tipo cuando se pase el ratón por encima. Elige un color del selector o introduce cualquier color CSS válido.",
					},
					labelColor: {
						title: "Color de la etiqueta de la propiedad",
						desc: "Establece un color personalizado para la etiqueta del nombre de la propiedad. Elige un color del selector o introduce cualquier color CSS válido.",
					},
					valueTextColor: {
						title: "Color del texto del valor",
						desc: "Establece un color personalizado para anular el color del texto normal del valor de la propiedad. Elige un color del selector o introduce cualquier color CSS válido.",
					},
				},
			},
		},
		massUpdate: {
			menuItemTitle: "Actualización masiva",
			modal: {
				title: "Actualización masiva de la propiedad {{key}}",
				desc: "Actualiza el valor de esta propiedad en varias notas a la vez.",
				warning:
					"Advertencia: ¡Esta actualización es permanente y puede afectar muchas notas a la vez!",
				includeAbsentSetting: {
					title: "Incluir propiedades ausentes",
					desc: "Si esta opción está desactivada y el valor de búsqueda está vacío, solo se actualizarán las notas que tengan la propiedad presente en su frontmatter.",
				},
				searchValueSetting: {
					title: "Valor de búsqueda",
					desc: "Solo se actualizarán las notas donde el valor actual de la propiedad sea este.",
				},
				newValueSetting: {
					title: "Nuevo valor",
					desc: "El nuevo valor al que se actualizará.",
				},
			},
		},
	},
	typeWidgets: {
		button: {
			name: "Botón",
		},
		color: {
			name: "Color",
		},
		dropdown: {
			name: "Desplegable",
			openNoteTooltip: "Abrir nota",
			settings: {
				options: {
					title: "Opciones",
					desc: "Administra las opciones disponibles para este desplegable. El valor a la izquierda será lo que se guarde en tu nota, y la etiqueta a la derecha será lo que se muestre en el desplegable.",
				},
				dynamicOptions: {
					title: "Opciones dinámicas",
					desc: "Usa JavaScript para generar dinámicamente opciones para este desplegable además de las listadas arriba. Puedes escribir tu código aquí y/o especificar un archivo .js. Tu código debe, a nivel superior, devolver un array de objetos con una clave para etiqueta y valor, ambos como cadenas ({value: string; label: string}[]).",
					inlineJs: {
						title: "JavaScript en línea",
						placeholder:
							'return [{value: "a", label: "Manzanas"}, {value: "b", label: "Bananas"}]',
					},
					fileJs: {
						title: "Cargar desde archivo *.js",
						placeholder: "ruta/al/archivo.js",
					},
				},
			},
			createOption: {
				value: {
					placeholder: "Valor",
					tooltip: "Valor",
				},
				label: {
					placeholder: "Etiqueta (opcional)",
					tooltip: "Etiqueta",
				},
				moveDownTooltip: "Mover opción hacia abajo",
				moveUpTooltip: "Mover opción hacia arriba",
				removeTooltip: "Eliminar opción",
			},
		},
		markdown: {
			name: "Markdown",
		},
		numberPlus: {
			name: "Número+",
			expressionModal: {
				title: "Actualizar por expresión",
				calculatedPrefix: "Calculado: ",
				expressionSetting: {
					title: "Expresión",
					desc: 'Introduce una expresión de JavaScript válida. Usa "x" para el valor actual.',
				},
			},
			settings: {
				validateSetting: {
					title: "Validar dentro de los límites",
					desc: "Si está activado, el número se validará con respecto a los valores mínimos y máximos establecidos antes de guardarse.",
				},
				minSetting: {
					title: "Mínimo",
					desc: "Si la validación está activada, este es el número mínimo permitido para la entrada.",
				},
				maxSetting: {
					title: "Máximo",
					desc: "Afecta al ancho de la entrada. Si la validación está activada, este es el número máximo permitido para la entrada.",
				},
				stepSetting: {
					title: "Paso",
					desc: "La cantidad que cambiará la entrada si se hace clic en los botones de más o menos.",
				},
			},
		},
		slider: {
			name: "Deslizador",
			settings: {
				minSetting: {
					title: "Mínimo",
					desc: "El valor mínimo que el deslizador puede alcanzar.",
				},
				maxSetting: {
					title: "Máximo",
					desc: "El valor máximo que el deslizador puede alcanzar.",
				},
				stepSetting: {
					title: "Paso",
					desc: "La cantidad más pequeña en la que se puede cambiar el deslizador.",
				},
				showLabelsSetting: {
					title: "Mostrar etiquetas",
					desc: "Si está activado, se mostrarán las etiquetas del mínimo y máximo.",
				},
			},
		},
		stars: {
			name: "Estrellas",
			settings: {
				overrideIconSetting: {
					title: "Sobrescribir icono de estrella",
					desc: "Establece un icono personalizado para mostrar en lugar de las estrellas predeterminadas.",
				},
				countSetting: {
					title: "Cantidad",
					desc: "Cuántas estrellas mostrar.",
				},
			},
		},
		toggle: {
			name: "Interruptor",
		},
	},
};
