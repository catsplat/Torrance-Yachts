import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".artifacts",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const ignoredSchemes = /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i;
const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await listMarkdownFiles(path.join(directory, entry.name))));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function localTarget(rawTarget) {
  const target = rawTarget.replace(/^<|>$/g, "").split(/[?#]/, 1)[0];

  if (!target || ignoredSchemes.test(target) || target.startsWith("/")) {
    return null;
  }

  return target;
}

function stripCodeFences(markdown) {
  return markdown.replace(/^```[\s\S]*?^```\s*$/gm, "");
}

const errors = [];
const markdownFiles = await listMarkdownFiles(root);

for (const file of markdownFiles) {
  const markdown = stripCodeFences(await readFile(file, "utf8"));
  const relativeFile = path.relative(root, file);

  for (const match of markdown.matchAll(markdownLink)) {
    const target = localTarget(match[1]);
    if (!target) {
      continue;
    }

    const targetPath = path.resolve(path.dirname(file), target);
    if (!targetPath.startsWith(`${root}${path.sep}`) && targetPath !== root) {
      errors.push(`${relativeFile}: link escapes the repository: ${target}`);
      continue;
    }

    try {
      await stat(targetPath);
    } catch {
      errors.push(`${relativeFile}: missing local link target: ${target}`);
    }
  }
}

try {
  JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  JSON.parse(await readFile(path.join(root, "tsconfig.json"), "utf8"));
} catch (error) {
  errors.push(`Invalid repository JSON: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Documentation validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Documentation validation passed for ${markdownFiles.length} Markdown files.`);
