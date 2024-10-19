import { Component } from "obsidian";

const renderCheckbox = (
	el: HTMLElement,
	data: {
		status: string;
		from: number;
		to: number;
	},
	sourcePath: string,
	component: Component
) => {
	el.createEl("input", { type: "checkbox" });
};
