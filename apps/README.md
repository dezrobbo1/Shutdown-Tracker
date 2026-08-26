# Apps

Application workspace.

Frontend surfaces:

- `console`: React/Vite Tier 1 Master Console shell with browser-local XML inspection and an opt-in imported-schedule evidence trial.
- `mobile-pwa`: React/Vite Tier 2/Tier 3 Assigned Tasks shell with a web app manifest.

The Console and Mobile clients remain separate applications. In ordinary mode they contain no fabricated projects, tasks, people, execution records, Critical reports, lifecycle history, or sync state. They show honest empty/unconfigured boundaries until production data paths exist. The fixed fictional Console/Mobile operational trial and its former static review datasets are not part of the current applications.

The Console alone provides an explicitly activated [Tier 1 Project Round-Trip Trial](../docs/product/tier1-project-roundtrip-trial.md). It can be started from an inspected local XML source, with the environment flag retained as a direct-entry shortcut. It operates only in browser memory and has no production persistence or backend write API. Mobile retains only the approved Assigned Tasks frame and an empty state; its production assignment/task data path is not built.

Console Import / Export retains a bounded browser-only Microsoft Project XML/MSPDI inspector and optional configured import snapshot GETs. The final export and Project round-trip workflow is not finalised and is not presented as active product authority.

Run from the repository root after installing npm dependencies:

```text
npm test
npm run build
```
