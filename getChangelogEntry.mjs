import { readFileSync } from "fs";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const escaped = version.replaceAll(".", "\\.");
const changelogContent = readFileSync("changelog.md", "utf8");

const regex = new RegExp(
	"^##\\s*" + escaped + "\\b[\\r\\n]+([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))",
	"gms"
);
const entry = regex.exec(changelogContent)?.[1];
if (!entry) {
	throw new Error(
		`No changelog entry found for version "${version}" in changelog.md`
	);
}
console.log("## Changelog\n\n" + entry);
