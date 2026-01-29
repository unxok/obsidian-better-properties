import { readFileSync, writeFileSync, rmSync } from "fs";
import process from "process";

const createContent = (changelogEntry) => {
	return `// CAUTION: the build process is setup to write to this file\nexport const latest = ${changelogEntry};`;
};

const main = async () => {
	let changelogEntry = readFileSync("tmp", "utf-8");
	const stringified = JSON.stringify({ markdown: changelogEntry });
	writeFileSync("src/changelog/latest.ts", createContent(stringified));
	rmSync("tmp");
};

main();
process.exit();
