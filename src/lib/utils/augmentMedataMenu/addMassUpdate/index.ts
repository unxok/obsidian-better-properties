import { metdataSectionId } from "src/lib/constants";
import { MetadataAddItemProps } from "..";
import { Modal, TextComponent, Setting, ToggleComponent } from "obsidian";

export const addMassUpdate = (props: MetadataAddItemProps) => {
	props.menu.addItem((item) => {
		item.setSection(metdataSectionId)
			.setIcon("pencil-ruler")
			.setTitle("Mass update")
			.onClick(() => onClick(props));
	});
};

const onClick = ({ plugin: { app }, files, key }: MetadataAddItemProps) => {
	const { vault, fileManager } = app;
	const modal = new Modal(app).setTitle('Mass update property "' + key + '"');
	modal.contentEl.createEl("p", {
		text: "Update this property's value for many notes at once.",
	});
	modal.contentEl.createEl("p", {
		text: "Warning: This update is permanent and may affect many notes at once!",
		cls: "properties-plus-plus-text-error",
	});
	let includeAbsentCmp: ToggleComponent;
	let searchCmp: TextComponent;
	let valueCmp: TextComponent;

	new Setting(modal.contentEl)
		.setName("Include absent properties")
		.setDesc(
			"If this is off and if the search value is empty/blank, Only notes that have the property present in their frontmatter will be updated."
		)
		.addToggle((cmp) =>
			cmp.setValue(false).then((cmp) => (includeAbsentCmp = cmp))
		);

	new Setting(modal.contentEl)
		.setName("Search value")
		.setDesc(
			"Only notes where the property's current value is this will be updated."
		)
		.addText((cmp) =>
			cmp
				.setValue("")
				.then((cmp) => (searchCmp = cmp))
				.onChanged()
		);

	new Setting(modal.contentEl)
		.setName("New value")
		.setDesc("The new value to update to.")
		.addText((cmp) =>
			cmp
				.setValue("")
				.then((cmp) => (valueCmp = cmp))
				.onChanged()
		);

	new Setting(modal.contentEl).addButton((cmp) =>
		cmp
			.setButtonText("update")
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
					return console.log("nope");

				fm[key] = newValue;
			});
		});
		await Promise.all(promises);
		modal.close();
	};

	modal.open();
};
