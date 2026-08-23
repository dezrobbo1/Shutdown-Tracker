# Apps

Application workspace.

Implemented frontend surfaces:

- `console`: React/Vite Tier 1 Master Console visual shell with the guarded browser round-trip review workspace beneath Import / Export.
- `mobile-pwa`: React/Vite Tier 2/Tier 3 Assigned Tasks visual shell with a web app manifest.

The ordinary Console uses synthetic data by default and may perform configured read-only import/export review GETs. Its guarded workspace can inspect Project MSPDI/XML locally in the browser and, when connected, drive the existing backend acceptance path. The Mobile App uses static synthetic data only. Neither client implements production task writes or direct Microsoft Project write-back.

Run from the repository root after installing npm dependencies:

```text
npm test
npm run build
```
