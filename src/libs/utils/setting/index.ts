import { Setting } from "obsidian";

export const createSectionOld = (
	el: HTMLElement,
	label: string,
	defaultOpen?: boolean
) => {
	const heading = new Setting(el)
		.setHeading()
		.setName(label)
		.setClass("better-properties-setting-nested-heading");

	const icon = createSpan({
		text: ">",
		attr: { style: "display: inline-block;" },
	});
	// setIcon(iconEl, "chevron-right");
	heading.nameEl.insertAdjacentElement("afterbegin", icon);
	icon.insertAdjacentElement("afterend", createSpan({ text: " " }));
	if (defaultOpen) {
		icon.style.rotate = "90deg";
	}

	const defaultDisplay = defaultOpen ? "display: block;" : "display: none;";

	const content = el.createDiv({
		cls: "better-properties-setting-nested-content",
		attr: { style: defaultDisplay },
	});
	heading.settingEl.addEventListener("click", () => {
		if (content.style.display === "none") {
			icon.style.rotate = "90deg";
			return (content.style.display = "block");
		}
		icon.style.rotate = "0deg";
		content.style.display = "none";
	});
	return { heading, content, icon };
};

// TODO I think the collapsible sections wasn't actually needed and the implementation wasn't really accessible-friendly
// so once I make sure it doesn't break anything, I'll delete the old implementation

export const createSection = (
	el: HTMLElement,
	label: string,
	defaultOpen?: boolean
) => {
	const heading = new Setting(el).setHeading().setName(label);

	return { heading, content: el };
};

export const searchSettings = (container: HTMLElement, query: string) => {
	const settingItems = container.querySelectorAll("& > div.setting-item");
	settingItems.forEach((el) => {
		if (!(el instanceof HTMLElement)) return;
		if (el.classList.contains("setting-item-heading")) return;
		if (!query) {
			el.style.removeProperty("display");
			return;
		}
		const lower = query.toLowerCase();
		const title = el.find("div.setting-item-name")?.textContent?.toLowerCase();
		const desc = el
			.find("div.setting-item-description")
			?.textContent?.toLowerCase();
		console.log(title, desc);
		const isMatch = title?.includes(lower) || desc?.includes(lower);
		if (!isMatch) {
			el.style.display = "none";
			return;
		}
		el.style.removeProperty("display");
	});
};
