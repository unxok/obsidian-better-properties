import * as v from "valibot";

/**
 * Creates an optional object schema which has a default value of the provided object parsed with an empty object
 */
export const vOptionalObjectWithDefault = <
	T extends {
		[key: string]: v.OptionalSchema<v.GenericSchema, {}>;
	}
>(
	object: T
) => {
	const schema = v.object(object);
	return v.optional(schema, v.parse(schema, {}));
};

export type VOptionalObjectWithDefault = ReturnType<
	typeof vOptionalObjectWithDefault<
		Record<string, v.OptionalSchema<v.GenericSchema, {}>>
	>
>;

export const renderIssues = (
	containerEl: HTMLElement,
	issues: [v.ObjectIssue | v.StringIssue, ...(v.ObjectIssue | v.StringIssue)[]]
) => {
	Object.values(v.flatten(issues)).forEach((issueType) =>
		renderIssueType(containerEl, issueType)
	);
};

const renderIssueType = (
	containerEl: HTMLElement,
	issueType: v.FlatErrors<undefined>[keyof v.FlatErrors<undefined>]
): void => {
	const listEl = containerEl.createEl("ul");
	if (!issueType) return;
	if (Array.isArray(issueType)) {
		issueType.forEach((text) => {
			listEl.createEl("li", { text });
		});
		return;
	}
	Object.entries(issueType).forEach(([key, value]) => {
		listEl.createEl("li", {}, (listEl) => {
			listEl.createEl("b", { text: key });
		});
		if (!value) return;
		if (typeof value === "string") {
			listEl.createEl("li", { text: value });
			return;
		}
		const subListEl = listEl.createEl("ul");
		value.forEach((text) => {
			subListEl.createEl("li", { text });
		});
	});
};

export const formatIssues = (
	issues: [v.ObjectIssue | v.StringIssue, ...(v.ObjectIssue | v.StringIssue)[]]
): string => {
	return Object.values(v.flatten(issues))
		.map((issueType) => formatIssueType(issueType))
		.join("\n");
};

const formatIssueType = (
	issueType: v.FlatErrors<undefined>[keyof v.FlatErrors<undefined>]
): string => {
	let finalText = "";
	if (!issueType) return finalText;
	if (Array.isArray(issueType)) {
		issueType.forEach((text) => {
			finalText += `\n\t${text}`;
		});
		return finalText;
	}
	Object.entries(issueType).forEach(([key, value]) => {
		finalText += `\n\t${key}`;
		if (!value) return;
		value.forEach((text) => {
			finalText += `\n\t\t${text}`;
		});
	});

	return finalText;
};
