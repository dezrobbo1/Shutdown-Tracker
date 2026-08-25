# Apps

Application workspace.

Implemented frontend surfaces:

- `console`: React/Vite Tier 1 Master Console review shell with an opt-in imported-schedule evidence trial.
- `mobile-pwa`: React/Vite Tier 2/Tier 3 Assigned Tasks visual-review shell with a web app manifest.

The Console and Mobile clients remain separate applications. In ordinary mode, their project, assignment, execution, Critical, lifecycle, mapping, and offline data is static and synthetic, and write-like controls are disabled. The fixed fictional Console/Mobile operational trial is not part of the current applications.

The Console alone provides an explicitly flagged [Tier 1 Project Round-Trip Trial](../docs/product/tier1-project-roundtrip-trial.md). It operates a selected Microsoft Project XML/MSPDI source in browser memory and has no production persistence or backend write API. The Mobile App remains a static visual shell.

Console Import / Export retains a bounded browser-only Microsoft Project XML/MSPDI inspector and optional configured import snapshot GETs. The final export and Project round-trip workflow is not finalised and is not presented as active product authority.

Run from the repository root after installing npm dependencies:

```text
npm test
npm run build
```
