import { setIcon } from "obsidian";

type AddDragHandleProps<T> = {
	containerEl: HTMLElement;
	index: number;
	itemsContainerEl: HTMLElement;
	items: T[];
	onDragEnd: (items: T[], indexFrom: number, indexTo: number) => void;
	dragStyle: "indicator" | "swap";
	handleEl?: HTMLElement;
	draggingElClasses?: string[];
};

export const createDragHandle = <T>({
	containerEl,
	index,
	itemsContainerEl,
	items,
	onDragEnd,
	dragStyle,
	handleEl,
	draggingElClasses,
}: AddDragHandleProps<T>) => {
	const onMouseDown = (e: MouseEvent) => {
		document.body.classList.add("is-grabbing");
		const { left, top, width, height } = containerEl.getBoundingClientRect();
		const dragTargetEl = document.body.createDiv({
			cls: "better-properties-list-drag-target",
			attr: {
				style: `display: block; width: ${width}px; left: ${left}px;`,
			},
		});
		const dragEl = createDragEl(
			containerEl,
			width,
			left,
			height,
			top,
			draggingElClasses
		);
		containerEl.classList.add("better-properties-dragging-origin");
		if (dragStyle === "swap") {
			containerEl.classList.add("drag-ghost-hidden");
		}

		const lastPos = {
			x: e.clientX,
			y: e.clientY,
		};

		let oldDiff = {
			x: 0,
			y: 0,
		};

		let closestItem = {
			index: -1,
			pos: -1,
		};

		const onMouseMove = (e: MouseEvent) => {
			const diffX = e.clientX - lastPos.x;
			const diffY = e.clientY - lastPos.y;

			const itemEls = Array.from(itemsContainerEl.children);
			// find closest item
			closestItem = itemEls.reduce(
				(...args) =>
					reduceClosestEl(
						{ originIndex: index, ev: e, dir: "vertical" },
						...args
					),
				closestItem
			);

			if (dragStyle === "indicator") {
				updateDragTarget(dragTargetEl, index, {
					index: closestItem.index,
					y: closestItem.pos,
				});
			}

			if (dragStyle === "swap") {
				const closestEl = itemEls[closestItem.index];
				closestEl &&
					updateItemElPosition(
						containerEl,
						itemsContainerEl,
						closestEl,
						closestItem.index
					);
			}

			// apply styles to dragged element
			dragEl.style.left = left + oldDiff.x + diffX + "px";
			dragEl.style.top = top + oldDiff.y + diffY + "px";
			// record coords for next iteration
			lastPos.x = e.clientX;
			lastPos.y = e.clientY;
			oldDiff.x += diffX;
			oldDiff.y += diffY;
		};

		const onMouseUp = () => {
			document.body.classList.remove("is-grabbing");
			dragEl.remove();
			dragTargetEl.remove();
			containerEl.classList.remove(
				"better-properties-dragging-origin",
				"drag-ghost-hidden"
			);
			if (closestItem.index !== index && closestItem.index !== -1) {
				onDragEnd(items, index, closestItem.index);
			}
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			closestItem.index = index;
			onMouseUp();
			document.removeEventListener("keydown", onKeyDown);
		};

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	};

	const button = handleEl ?? createEl("button", { cls: "clickable-icon" });
	if (!handleEl) {
		setIcon(button, "grip-vertical");
	}
	button.addEventListener("mousedown", onMouseDown);

	return button;
};

const createDragEl = (
	baseEl: HTMLElement,
	width: number,
	left: number,
	height: number,
	top: number,
	cssClasses?: string[]
) => {
	const dragEl = createDiv({ cls: "drag-reorder-ghost" });
	dragEl.createDiv(); // mainly for setting-item divs to not look wonky
	dragEl.appendChild(baseEl.cloneNode(true) as HTMLElement);
	dragEl.classList.remove("better-properties-background-fade");
	if (cssClasses) {
		dragEl.classList.add(...cssClasses);
	}
	dragEl.style.width = width + "px";
	dragEl.style.left = left + "px";
	dragEl.style.top = top + "px";
	// dragEl.style.height = height + "px";
	document.body.appendChild(dragEl);
	return dragEl;
};

const updateDragTarget = (
	el: HTMLElement,
	index: number,
	closest: { index: number; y: number }
) => {
	el.style.top = closest.y + "px";
	if (closest.index !== index) {
		el.style.display = "block";
	} else {
		el.style.display = "none";
	}
};

const updateItemElPosition = (
	itemEl: HTMLElement,
	itemsContainerEl: HTMLElement,
	closestEl: Element,
	toIndex: number
) => {
	// const closestEl = itemEls[closestItem.index];
	const currentIndex = itemsContainerEl.indexOf(itemEl);
	if (currentIndex === -1 || currentIndex === toIndex) return;

	const isGreater = toIndex > currentIndex;
	if (isGreater) {
		closestEl.insertAdjacentElement("afterend", itemEl);
		return;
	}
	closestEl.insertAdjacentElement("beforebegin", itemEl);
};

const reduceClosestEl = (
	context: {
		originIndex: number;
		ev: MouseEvent;
		dir: "vertical" | "horizontal";
	},
	closest: { index: number; pos: number },
	child: Element,
	i: number,
	_arr: Element[]
) => {
	// to make typescript happy
	if (!(child instanceof HTMLElement)) return closest;
	const { originIndex, ev, dir } = context;
	const { top, bottom, left, right, x, y, width, height } =
		child.getBoundingClientRect();
	const isGreaterIndex = i > originIndex;
	const getPos = () => {
		if (dir === "vertical") {
			return isGreaterIndex ? bottom : top;
			// return top + height / 2;
		}
		return isGreaterIndex ? right : left;
		// return left + width / 2;
	};

	const pos = getPos();

	if (closest.index === -1) {
		return { index: i, pos };
	}
	// this child is farther than the currently recorded one
	if (Math.abs(pos - ev.clientY) > Math.abs(closest.pos - ev.clientY))
		return closest;

	// else this child is closer
	return { index: i, pos };
};
