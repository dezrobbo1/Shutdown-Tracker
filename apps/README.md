# Apps

Application workspace.

Implemented frontend surfaces:

- `console`: React/Vite Tier 1 Master Console product-trial shell.
- `mobile-pwa`: React/Vite Tier 2/Tier 3 Assigned Tasks product-trial shell with a web app manifest.

The Console and Mobile clients remain separate applications. In ordinary mode, their project, assignment, execution, Critical, lifecycle, mapping, and offline data is static and synthetic, and write-like controls are disabled.

When `VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true`, the separate clients consume the shared deterministic frontend model. Bounded synthetic assignment, execution, end-of-shift progress, Critical configuration/reporting, clock, history, and reset interactions become locally available for product review. They use no production persistence or backend write APIs. See [Deterministic Operational Trial](../docs/product/deterministic-operational-trial.md).

Console Import / Export retains a bounded browser-only Microsoft Project XML/MSPDI inspector and optional configured import snapshot GETs. The final export and Project round-trip workflow is not finalised and is not presented as active product authority.

Run from the repository root after installing npm dependencies:

```text
npm test
npm run build
```
