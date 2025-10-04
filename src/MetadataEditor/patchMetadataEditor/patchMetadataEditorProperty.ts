import BetterProperties from "~/main";
import { PatchedMetadataEditor } from ".";
// import { around, dedupe } from "monkey-around";
import { Constructor, MarkdownView } from "obsidian";
// import { monkeyAroundKey } from "~/lib/constants";
// import { refreshPropertyEditor } from "..";
// import { MetadataEditorProperty } from "obsidian-typings";

export const patchMetadataEditorProperty = (
	plugin: BetterProperties,
	metadataEditorPrototype: PatchedMetadataEditor
) => {
	const { app } = plugin;

	const proto =
		metadataEditorPrototype.constructor as Constructor<PatchedMetadataEditor>;
	class ME extends proto {
		constructor() {
			super();
		}
	}
	const metadataEditor = new ME();

	metadataEditor._children = [];
	metadataEditor._events = [];
	metadataEditor.owner = {
		getFile: () => {},
	} as MarkdownView;
	metadataEditor.addPropertyButtonEl;
	metadataEditor.propertyListEl = createDiv();
	metadataEditor.containerEl = createDiv();
	metadataEditor.app = app;
	metadataEditor.properties = [];
	metadataEditor.rendered = [];
	metadataEditor.headingEl = createDiv();
	metadataEditor.addPropertyButtonEl = createEl("button");
	// @ts-ignore TODO
	metadataEditor.errorEl = createDiv();
	metadataEditor.owner.getHoverSource = () => "source";
	metadataEditor.load();
	metadataEditor.synchronize({ tags: "[]" });
	const MetadataEditorPropertyPrototype = Object.getPrototypeOf(
		metadataEditor.rendered[0]
	) as (typeof metadataEditor.rendered)[0];

	MetadataEditorPropertyPrototype; // stops no-unused-variables rule

	// I don't this is actually needed. And it causes issues with focusing the valueEl when pressing Enter withint the keyInputEl.
	// const removePatch = around(MetadataEditorPropertyPrototype, {
	// 	handleUpdateKey(old) {
	// 		return dedupe(monkeyAroundKey, old, function (newKey) {
	// 			// @ts-ignore
	// 			const that = this as MetadataEditorProperty;

	// 			const returnValue = old.call(that, newKey);
	// 			refreshPropertyEditor(plugin, newKey);
	// 			return returnValue;
	// 		});
	// 	},
	// });

	// plugin.register(removePatch);
};
