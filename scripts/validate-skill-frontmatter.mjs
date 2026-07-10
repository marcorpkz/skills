import { readFileSync } from "node:fs";
import YAML from "yaml";

const filePath = process.argv[2];
if (!filePath) {
  throw new Error("Usage: validate-skill-frontmatter.mjs <SKILL.md>");
}

const text = readFileSync(filePath, "utf8");
const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!match) {
  throw new Error(`Missing YAML frontmatter: ${filePath}`);
}

const parsed = YAML.parse(match[1]);
if (!parsed || typeof parsed !== "object") {
  throw new Error(`Frontmatter must parse to an object: ${filePath}`);
}
if (typeof parsed.name !== "string" || parsed.name.length === 0) {
  throw new Error("Frontmatter requires name");
}
if (typeof parsed.description !== "string" || parsed.description.length === 0) {
  throw new Error("Frontmatter requires description");
}

console.log(JSON.stringify({ name: parsed.name, description: parsed.description }));

