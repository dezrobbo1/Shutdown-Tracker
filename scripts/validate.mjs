import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const scanRoots = ["src", "scripts", "tests", "apps/console/scripts", "apps/mobile-pwa/scripts"];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (/\.(?:js|mjs)$/.test(entry.name)) {
      files.push(path);
    }
  }
}

for (const relativePath of scanRoots) {
  await collect(resolve(root, relativePath));
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
