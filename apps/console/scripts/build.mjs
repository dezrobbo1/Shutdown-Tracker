import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(import.meta.dirname, "../../..");
const dist = resolve(appRoot, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(repositoryRoot, "index.html"), resolve(dist, "index.html"));
await cp(resolve(repositoryRoot, "src"), resolve(dist, "src"), { recursive: true });

console.log(`Built the shared XML round-trip lab for ${appRoot}.`);
