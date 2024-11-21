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
	const ITEM = "setting-item";
	const HEADING = "setting-item-heading";

	const headings: [el: HTMLElement, hasMatch: boolean][] = [];

	const settingItems = container.querySelectorAll(`& > div.${ITEM}`);
	settingItems.forEach((el) => {
		if (!(el instanceof HTMLElement)) return;

		if (el.classList.contains(HEADING)) {
			headings.push([el, false]);
			return;
		}

		const hLen = headings.length;
		const currentHeading = hLen ? headings[hLen - 1] : null;

		const show = () => {
			el.style.removeProperty("display");
			if (!currentHeading) return;
			currentHeading[1] = true;
		};

		// query is empty, show everything
		if (!query) return show();

		// match query to text contents
		const lower = query.toLowerCase();
		const title = el.find(`div.${ITEM}-name`)?.textContent?.toLowerCase();
		const desc = el.find(`div.${ITEM}-description`)?.textContent?.toLowerCase();
		const isMatch = title?.includes(lower) || desc?.includes(lower);

		if (isMatch) return show();

		// not a match
		el.style.display = "none";
	});

	headings.forEach(([el, isMatch]) => {
		if (isMatch) return el.style.removeProperty("display");
		el.style.setProperty("display", "none");
	});
};
