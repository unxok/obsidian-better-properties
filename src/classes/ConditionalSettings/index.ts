import { Setting } from "obsidian";

class ConditionalSettings<GroupNameUnion extends string> {
	constructor(
		public parentEl: HTMLElement,
		public owner?: ConditionalSettings<any>
	) {
		if (!owner) return;
		owner.register(() => {
			this.hideAllGroups();
		});
	}

	groups: Record<string, SettingsGroup> = {};
	currentGroup: string | null = null;
	registerCallbacks: (() => void)[] = [];

	addGroup(
		groupName: GroupNameUnion,
		cb: (group: SettingsGroup) => void
	): this {
		const group = new SettingsGroup(this);
		this.groups[groupName] = group;
		cb(group);
		return this;
	}

	hideAllGroups(): void {
		Object.values(this.groups).forEach((g) => {
			if (g instanceof SettingsGroup) {
				g.hide();
				return;
			}
		});
		this.registerCallbacks.forEach((cb) => cb());
	}

	showGroup(groupName: GroupNameUnion): void {
		this.currentGroup = groupName;
		const group = this.groups[groupName];
		if (!group) {
			throw new Error(`"${groupName}" is not a known group`);
		}
		this.hideAllGroups();
		group.show();
	}

	register(cb: () => void): this {
		this.registerCallbacks.push(cb);
		return this;
	}

	then(cb: (t: this) => void): this {
		cb(this);
		return this;
	}
}

class SettingsGroup {
	settingAdders: ((s: Setting) => void)[] = [];
	set: Set<Setting> = new Set();
	parentEl: HTMLElement;

	constructor(public owner: ConditionalSettings<any>) {
		this.parentEl = owner.parentEl;
	}

	addSetting(cb: (s: Setting) => void): this {
		this.settingAdders.push(cb);
		return this;
	}

	show(): void {
		const { parentEl, set, settingAdders } = this;
		settingAdders.forEach((cb) => {
			const setting = new Setting(parentEl);
			cb(setting);
			set.add(setting);
		});
	}

	hide(): void {
		this.set.forEach((s) => s.settingEl.remove());
		this.set.clear();
	}

	then(cb: (t: this) => void): this {
		cb(this);
		return this;
	}
}

export { ConditionalSettings, type SettingsGroup };
