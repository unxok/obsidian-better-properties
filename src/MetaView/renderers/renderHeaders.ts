import { toNumberNotNaN } from "@/libs/utils/pure";
import BetterProperties from "@/main";
import { setIcon } from "obsidian";
import { BlockConfig, Field, SaveBlockConfig } from "@/MetaView/shared";

export const renderHeaders = ({
	plugin,
	tableHeadRowEl,
	blockConfig,
	saveBlockConfig,
}: {
	plugin: BetterProperties;
	tableHeadRowEl: HTMLElement;
	blockConfig: BlockConfig;
	saveBlockConfig: SaveBlockConfig;
}) => {
	const { fields } = blockConfig;
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		const display = field.alias
			? field.alias
			: field.type === "tags"
			? "tags"
			: field.value;
		const th = tableHeadRowEl.createEl("th", {
			cls: "better-properties-metaview-table-header",
		});

		const setColWidthVar = (n: number) => {
			th.style.setProperty("--col-width", n + "px");
		};

		if (field.colWidth) {
			const n = toNumberNotNaN(field.colWidth, 1);
			setColWidthVar(n < 0 ? 0 : n);
		}

		th.createDiv(
			{
				cls: "better-properties-metaview-table-resizer",
			},
			(el) => {
				el.addEventListener("dblclick", () => {
					delete field.colWidth;
					saveBlockConfig(blockConfig);
				});

				el.addEventListener("mousedown", (e) => {
					el.classList.add("better-properties-mod-is-dragging");
					let lastPos = e.clientX;
					let lastWidth = field.colWidth ?? th.getBoundingClientRect().width;
					const onMouseMove = (e: MouseEvent) => {
						const diff = e.clientX - lastPos;
						lastWidth += diff;
						setColWidthVar(lastWidth < 0 ? 0 : lastWidth);
						lastPos = e.clientX;
					};
					const onMouseUp = async () => {
						el.classList.remove("better-properties-mod-is-dragging");
						field.colWidth = lastWidth;
						await saveBlockConfig(blockConfig);
						document.removeEventListener("mousemove", onMouseMove);
						document.removeEventListener("mouseup", onMouseUp);
					};

					document.addEventListener("mousemove", onMouseMove);
					document.addEventListener("mouseup", onMouseUp);
				});
			}
		);
		const wrapper = th.createDiv({
			cls: "better-properties-metaview-table-header-wrapper",
		});
		const iconEl = wrapper.createSpan({
			cls: "better-properties-metaview-table-header-icon",
		});
		setIcon(iconEl, getIconName(plugin, field));
		wrapper.createSpan({
			text: display,
			cls: "better-properties-metaview-table-header-name",
		});
	}
};

const getIconName = (plugin: BetterProperties, col: Field) => {
	if (col.type === "fileData") return "file";
	if (col.type === "property") {
		const customIcon = plugin.getPropertySetting(col.value)?.general
			?.customIcon;
		if (customIcon) return customIcon;
		const assignedType = plugin.app.metadataTypeManager.getAssignedType(
			col.value
		);
		if (!assignedType) return "text";
		const defaultIcon =
			plugin.app.metadataTypeManager.registeredTypeWidgets[assignedType]?.icon;
		return defaultIcon ?? "text";
	}
	if (col.type === "tags") return "tags";
	return "hash";
};
