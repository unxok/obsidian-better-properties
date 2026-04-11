import { BetterProperties } from "#/Plugin";
import { SelectOption } from "./types";

/**
 * Gets a random color by preferring to use colors not in use by existing options nor the most recent color
 */
export const getRandomColor = ({
	plugin,
	options,
}: {
	plugin: BetterProperties;
	options: SelectOption[];
}) => {
	const {
		appearanceSettings: { colors },
	} = plugin.getSettings();

	const backgrounds = new Set<string>();
	options.forEach((o) => {
		if (!o.background) return;
		backgrounds.add(o.background);
	});

	const unusedColors = colors.filter((c) => !backgrounds.has(c.background));
	const isAllColorsUsed = unusedColors.length === 0;

	const availableColors = isAllColorsUsed ? colors : unusedColors;

	const min = 0;
	const max = availableColors.length - 1;

	// exclude last index if all colors are used to avoid using the most recently used color
	const isMaxExclusive = !!isAllColorsUsed;

	const index =
		Math.floor(Math.random() * (max - min + (isMaxExclusive ? 0 : 1))) + min;
	return availableColors[index].background;
};
