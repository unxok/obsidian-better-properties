export type TypeKeys = PropertySettings;

export type PropertySettings = {
	general: {
		hidden: boolean;
		cssClass: string;
		customIcon: string;
		iconColor: string;
		iconHoverColor: string;
		labelColor: string;
		textColor: string;
	};
	slider: {
		min: number;
		max: number;
		step: number;
		showLabels: boolean;
	};
	numberPlus: {
		min: number;
		max: number;
		step: number;
		validate: boolean;
	};
	dropdown: {
		options: { value: string; label: string }[];

		dynamicInlineJs: string;
		dynamicFileJs: string;
	};
	button: {
		displayText: string;
		icon: string;
		callbackType: "inlineJs" | "fileJs" | "Command";
		style:
			| "default"
			| "accent"
			| "warning"
			| "destructive"
			| "muted"
			| "ghost";
		bgColor: string;
		textColor: string;
		cssClass: string;
	};
	toggle: {};
	color: {};
	markdown: {};
	email: {};
	stars: {
		customIcon: string;
		max: number;
	};
};

// can't think of a way to have this typed properly but at least this avoids hard coding the keys somewhat
export const defaultPropertySettings: PropertySettings = {
	general: {
		hidden: false,
		cssClass: "",
		customIcon: "",
		iconColor: "",
		iconHoverColor: "",
		labelColor: "",
		textColor: "",
	},
	slider: {
		min: 0,
		max: 100,
		step: 1,
		showLabels: true,
	},
	numberPlus: {
		min: 0,
		max: 100000,
		step: 1,
		validate: true,
	},
	dropdown: {
		options: [
			{ label: "Apples", value: "apples" },
			{ label: "Oranges", value: "oranges" },
			{ label: "Bananas", value: "bananas" },
		],
		dynamicInlineJs: "",
		dynamicFileJs: "",
	},
	button: {
		displayText: "click me",
		callbackType: "inlineJs",
		icon: "",
		style: "default",
		bgColor: "",
		textColor: "",
		cssClass: "",
	},
	toggle: {},
	color: {},
	markdown: {},
	email: {},
	stars: {
		customIcon: "star",
		max: 5,
	},
};
