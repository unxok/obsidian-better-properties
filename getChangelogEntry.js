import { readFileSync } from "fs";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const escaped = version.replaceAll(".", "\\.");
const changelogContent = readFileSync("changelog.md", "utf8");

const regex = new RegExp(
	"^##\\s*" + escaped + "\\b[\\r\\n]+([\\s\\S]*?)(?=^##\\s|\\Z)",
	"gms"
);
const entry = regex.exec(changelogContent)?.[1] ?? "No changelog entry found";
console.log("# Changelog\n" + entry);
