import { displayTooltip, TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyWidgetComponent,
} from "../utils";
import { tryCatch } from "~/lib/utils";

/**
 * TODO
 * Current implementation is wrong. Instead should behave like the "Frontmatter Title" plugin where it *displays* the value of this property, rather than actually renaming the file.
 *
 * Might not even include this type due to the other plugin existing
 */

export const renderWidget: CustomPropertyType["renderWidget"] = ({
	plugin,
	el,
	ctx,
	value,
}) => {
	// const settings = getPropertyTypeSettings({
	// 	plugin,
	// 	property: ctx.key,
	// 	type: "toggle",
	// });

	const container = el.createDiv({
		cls: "better-properties-property-value-inner better-properties-mod-title",
	});

	const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
	if (!file) {
		throw new Error("File not found by ctx.sourcePath of: " + ctx.sourcePath);
	}

	const title = file.basename;
	const text = new TextComponent(container).setValue(title);

	const doRename = async () => {
		const newPath =
			(file.parent?.path ?? "") + "/" + text.getValue() + "." + file.extension;
		const { success, error } = await tryCatch(
			plugin.app.fileManager.renameFile(file, newPath)
		);
		if (success) return;
		text.setValue(title);
		displayTooltip(text.inputEl, error, {
			placement: "bottom",
			classes: ["mod-error"],
		});
	};

	if (!value || title !== value) {
		// property is rendered with no value
		// so it's likely rendered for the first time

		// 0 timeout because without it, it will usually just remove all properties
		window.setTimeout(() => {
			ctx.onChange(title);
		}, 0);
	}

	text.inputEl.addEventListener("blur", doRename);
	text.inputEl.addEventListener("keydown", async (e) => {
		if (e.key === "Enter") {
			await doRename();
		}
		if (e.key === "Escape") {
			text.setValue(title);
		}
	});

	const cmp = new PropertyWidgetComponent(
		"title",
		container,
		(v) => {
			text.setValue(v?.toString() ?? "");
			doRename();
		},
		() => {
			text.inputEl.focus();
		}
	);
	return cmp;
};
