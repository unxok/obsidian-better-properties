import { readFileSync } from "fs";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const escaped = version.replaceAll(".", "\\.");
const changelogContent = readFileSync("changelog.md", "utf8");

const regex = new RegExp("^##\\s*" + escaped + "\\b.*?(?=^##\\s|\\Z)", "gms");
const entry = regex.exec(changelogContent)?.[0] ?? "No changelog entry found";
console.log(entry);
