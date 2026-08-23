# Packages

Shared cross-application contracts and clients live here when they have a real implementation and owner.

Current packages:

- `api-client`: TypeScript client for current import/export review API surfaces.
- `@shutdown-tracker/trial-model`: pure TypeScript fixed scenario, simulated clock, reducer, projections, reset/replay, and optional ephemeral bridge messages for the deterministic frontend operational trial. It has no production persistence or API-contract authority.
- `project-import-contract`: Java request/response records for API-to-worker Project import parse handoff.
- `project-export-contract`: Java request/response records for API-to-worker MSPDI/XML export artifact handoff.

The export client/contract surfaces are existing experimental compatibility infrastructure, not the final product workflow. [ADR-012](../docs/adr/ADR-012-product-trial-foundation-and-export-deferral.md) defers that contract until operational trials provide evidence.

Do not reserve empty package directories for possible future abstractions. Add a new shared package only when an implemented capability requires it and its ownership/boundary is clear.
