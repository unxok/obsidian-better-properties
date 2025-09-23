import { readFileSync } from "fs";

const version = process.env.npm_package_version;
const escaped = version.replaceAll(".", "\\.");
const changelogContent = readFileSync("changelog.md", "utf8");

const regex = new RegExp("^##\\s*" + escaped + "\\b.*?(?=^##\\s|\\Z)", "gms");
const entry = regex.exec(changelogContent)?.[0] ?? "";
console.log(entry);
