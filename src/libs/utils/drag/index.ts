import { Keymap, setIcon } from "obsidian";

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
		let isInitialized = false;
		const { left, top, width, height } = containerEl.getBoundingClientRect();
		const dragTargetEl = document.body.createDiv({
			cls: "better-properties-list-drag-target",
			attr: {
				style: `display: none; width: ${width}px; left: ${left}px;`,
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
			if (!isInitialized) {
				return (isInitialized = true);
			}
			containerEl.classList.add("better-properties-dragging-origin");
			if (dragStyle === "swap") {
				containerEl.classList.add("drag-ghost-hidden");
			}
			document.body.classList.add("is-grabbing");

			const diffX = e.clientX - lastPos.x;
			const diffY = e.clientY - lastPos.y;

			dragEl.style.removeProperty("display");

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

	button.addEventListener("click", (e) => {
		if (e.detail !== 0) return;

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
			left + 30,
			height,
			top + 30,
			draggingElClasses
		);
		containerEl.classList.add("better-properties-dragging-origin");
		if (dragStyle === "swap") {
			containerEl.classList.add("drag-ghost-hidden");
		}

		let closestItem = {
			index: index,
			pos: -1,
		};

		const finishDrag = () => {
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
		};

		const selectSibling = (e: KeyboardEvent, isUp: boolean) => {
			e.preventDefault();
			const itemEls = Array.from(itemsContainerEl.children);

			const nextIndex =
				closestItem.index + 1 > itemEls.length - 1
					? itemEls.length - 1
					: closestItem.index + 1;
			const prevIndex = closestItem.index - 1 < 0 ? 0 : closestItem.index - 1;

			isUp ? (closestItem.index = prevIndex) : (closestItem.index = nextIndex);

			const bounding = itemEls[closestItem.index].getBoundingClientRect();

			if (dragStyle === "indicator") {
				updateDragTarget(dragTargetEl, index, {
					index: closestItem.index,
					y: closestItem.index > index ? bounding.bottom : bounding.top,
				});
			}
			const closestEl = itemEls[closestItem.index];
			if (dragStyle === "swap") {
				closestEl &&
					updateItemElPosition(
						containerEl,
						itemsContainerEl,
						closestEl,
						closestItem.index
					);
			}

			const computed = getComputedStyle(closestEl);
			const parsedTop = parseInt(computed.top);
			const newTop = isUp ? parsedTop : 1 - parsedTop;
			dragEl.style.top = parseInt(dragEl.style.top) + newTop + "px";
		};

		const onKeyDown = (e: KeyboardEvent) => {
			const keys = [
				"Escape",
				" ",
				"Enter",
				"ArrowDown",
				"ArrowUp",
				"j",
				"k",
			] as const;
			type keyType = (typeof keys)[number];
			if (!keys.includes(e.key as keyType)) return;
			const eKey = e.key as keyType;
			if (eKey === "Escape") {
				closestItem.index = index;
				document.removeEventListener("keydown", onKeyDown);
				finishDrag();
				return;
			}
			if (eKey === "ArrowUp" || eKey === "k") return selectSibling(e, true);
			if (eKey === "ArrowDown" || eKey === "j") return selectSibling(e, false);
			if (eKey === " " || eKey === "Enter") {
				document.removeEventListener("keydown", onKeyDown);
				finishDrag();
			}
		};

		document.addEventListener("keydown", onKeyDown);
	});

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
	dragEl.style.display = "none";
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
	const { top, bottom, left, right } = child.getBoundingClientRect();

	const pos = getPos(originIndex, i, dir, { top, bottom, left, right });

	if (closest.index === -1) {
		return { index: i, pos };
	}
	// this child is farther than the currently recorded one
	if (Math.abs(pos - ev.clientY) > Math.abs(closest.pos - ev.clientY))
		return closest;

	// else this child is closer
	return { index: i, pos };
};

const getPos = (
	originIndex: number,
	targetIndex: number,
	dir: "vertical" | "horizontal",
	bounds: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	}
) => {
	const isGreaterIndex = targetIndex > originIndex;
	if (dir === "vertical") {
		return isGreaterIndex ? bounds.bottom : bounds.top;
		// return top + height / 2;
	}
	return isGreaterIndex ? bounds.right : bounds.left;
	// return left + width / 2;
};
