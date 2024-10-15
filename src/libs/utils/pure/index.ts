import { PropertySettings } from "@/libs/PropertySettings";

/**
 * Move an item in an array from one index to another
 * @remark You are responsible for ensuring the indexes are valid
 * @tutorial
 * ```ts
 * const arr = ['a', 'b', 'c', 'd'];
 * const newArr = arrayMove(arr, 1, 3);
 * // ['a', 'c', 'd', 'c']
 * ```
 */
export const arrayMove = <T>(arr: T[], from: number, to: number) => {
	const copy = [...arr];
	const item = copy[from];
	copy.splice(from, 1);
	copy.splice(to, 0, item);
	return copy;
};

export const getButtonStyledClass = (
	style: PropertySettings["button"]["style"]
) => {
	if (style === "accent") return "mod-cta";
	if (style === "destructive") return "mod-destructive";
	if (style === "ghost") return "clickable-icon";
	if (style === "muted") return "mod-muted";
	if (style === "warning") return "mod-warning";
	return "";
};

export const clampNumber = (
	num: number,
	min: number,
	max: number,
	nonInclusive?: boolean
) => {
	const underMin = nonInclusive ? num < min : num <= min;
	if (underMin) return min;
	const overMax = nonInclusive ? num > max : num >= max;
	if (overMax) return max;
	return num;
};

// Vite complains if you straight use eval
// but I need to use it sometimes to allow users to use JS for certain things
export const dangerousEval = eval;

export const findKeyInsensitive = (
	key: string,
	obj: Record<string, unknown>
) => {
	const found = Object.keys(obj).find(
		(k) => k.toLowerCase() === key.toLowerCase()
	);
	return found ?? null;
};
