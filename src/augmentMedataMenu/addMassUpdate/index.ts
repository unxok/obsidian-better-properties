import { metdataSectionId } from "@/libs/constants";
import { MetadataAddItemProps } from "..";
import { Modal, TextComponent, Setting, ToggleComponent } from "obsidian";
import { text } from "@/i18Next";

export const addMassUpdate = (props: MetadataAddItemProps) => {
	props.menu.addItem((item) => {
		item.setSection(metdataSectionId)
			.setIcon("pencil-ruler")
			.setTitle(text("augmentedPropertyMenu.massUpdate.menuItemTitle"))
			.onClick(() => onClick(props));
	});
};

const onClick = ({ plugin: { app }, files, key }: MetadataAddItemProps) => {
	const { vault, fileManager } = app;
	const modal = new Modal(app).setTitle(
		text("augmentedPropertyMenu.massUpdate.modal.title", { key })
	);
	modal.contentEl.createEl("p", {
		text: text("augmentedPropertyMenu.massUpdate.modal.desc"),
	});
	modal.contentEl.createEl("p", {
		text: text("augmentedPropertyMenu.massUpdate.modal.warning"),
		cls: "better-properties-text-error",
	});
	let includeAbsentCmp: ToggleComponent;
	let searchCmp: TextComponent;
	let valueCmp: TextComponent;

	new Setting(modal.contentEl)
		.setName(
			text(
				"augmentedPropertyMenu.massUpdate.modal.includeAbsentSetting.title"
			)
		)
		.setDesc(
			text(
				"augmentedPropertyMenu.massUpdate.modal.includeAbsentSetting.desc"
			)
		)
		.addToggle((cmp) =>
			cmp.setValue(false).then((cmp) => (includeAbsentCmp = cmp))
		);

	new Setting(modal.contentEl)
		.setName(
			text(
				"augmentedPropertyMenu.massUpdate.modal.searchValueSetting.title"
			)
		)
		.setDesc(
			text(
				"augmentedPropertyMenu.massUpdate.modal.searchValueSetting.desc"
			)
		)
		.addText((cmp) =>
			cmp
				.setValue("")
				.then((cmp) => (searchCmp = cmp))
				.onChanged()
		);

	new Setting(modal.contentEl)
		.setName(
			text("augmentedPropertyMenu.massUpdate.modal.newValueSetting.title")
		)
		.setDesc(
			text("augmentedPropertyMenu.massUpdate.modal.newValueSetting.desc")
		)
		.addText((cmp) =>
			cmp
				.setValue("")
				.then((cmp) => (valueCmp = cmp))
				.onChanged()
		);

	new Setting(modal.contentEl).addButton((cmp) =>
		cmp
			.setButtonText(text("buttonText.update"))
			.setCta()
			.onClick(async () => await doUpdate())
	);

	const doUpdate = async () => {
		const oldValue = searchCmp.getValue();
		const newValue = valueCmp.getValue();
		if (oldValue === newValue) {
			return modal.close();
		}
		const includeAbsent = includeAbsentCmp.getValue();
		const tFiles = includeAbsent
			? vault.getMarkdownFiles()
			: files.map((f) => vault.getFileByPath(f.path));

		const promises = tFiles.map(async (file) => {
			if (!file) return;
			await fileManager.processFrontMatter(file, (fm) => {
				// input values will always be strings
				// but if property exists but has no value it will be null
				const existing = fm[key] ?? "";
				if (existing !== oldValue) return;
				if (!includeAbsent && !fm.hasOwnProperty(key))
					fm[key] = newValue;
			});
		});
		await Promise.all(promises);
		modal.close();
	};

	modal.open();
};
