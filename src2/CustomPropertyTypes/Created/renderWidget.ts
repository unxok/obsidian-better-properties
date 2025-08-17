import { displayTooltip, moment, TextComponent } from "obsidian";
import { CustomPropertyType } from "../types";
import {
	// getPropertyTypeSettings,
	PropertyValueComponent,
} from "../utils";
import { tryCatch } from "~/lib/utils";

export const renderWidget: CustomPropertyType<number>["renderWidget"] = ({
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
		cls: "better-properties-property-value-inner better-properties-mod-created",
	});

	const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
	if (!file) {
		throw new Error("File not found by ctx.sourcePath of: " + ctx.sourcePath);
	}

	const ctime = file.stat.ctime;
	const dateInput = container.createEl("input", {
		type: "datetime",
		cls: "metadata-input metadata-input-text mod-datetime",
		attr: {
			disabled: "true",
			value: moment(ctime).format("yyyy-MM-DDTHH:mm"),
		},
	});

	// const doRename = async () => {
	// 	const newPath =
	// 		(file.parent?.path ?? "") + "/" + dateInput.getValue() + "." + file.extension;
	// 	const { success, error } = await tryCatch(
	// 		plugin.app.fileManager.renameFile(file, newPath)
	// 	);
	// 	if (success) return;
	// 	dateInput.setValue(ctime);
	// 	displayTooltip(dateInput.inputEl, error, {
	// 		placement: "bottom",
	// 		classes: ["mod-error"],
	// 	});
	// };

	if (!value || ctime !== value) {
		// property is rendered with no value
		// so it's likely rendered for the first time

		// 0 timeout because without it, it will usually just remove all properties
		window.setTimeout(() => {
			ctx.onChange(ctime);
		}, 0);
	}

	// dateInput.inputEl.addEventListener("blur", doRename);
	// dateInput.inputEl.addEventListener("keydown", async (e) => {
	// 	if (e.key === "Enter") {
	// 		await doRename();
	// 	}
	// 	if (e.key === "Escape") {
	// 		dateInput.setValue(ctime);
	// 	}
	// });

	return new PropertyValueComponent(
		container,
		(v) => {
			const str = v?.toString() ?? "";
			dateInput.value = moment(str).format("yyyy-MM-DDTHH:mm");
		},
		() => {
			dateInput.focus();
		}
	);
};
