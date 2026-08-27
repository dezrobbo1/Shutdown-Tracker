import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const directories = [resolve(root, "src"), resolve(root, "scripts"), resolve(root, "tests")];
const files = [];

for (const directory of directories) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) {
      files.push(resolve(directory, entry.name));
    }
  }
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
