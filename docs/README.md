# Documentation

This folder contains product, architecture, research, ADR, testing, and security notes for Shutdown Tracker.

No implementation is stored here. Documentation should preserve the product boundary that Microsoft Project remains the schedule authority and Shutdown Tracker remains the live execution and reporting authority.

Primary product authority:

- [Product Flow and Software Map](product/product-flow-and-software-map.md)
- [User Tier and Assignment Model](product/user-tier-and-assignment-model.md)
- [Task Operational Model](product/task-operational-model.md)
- [Critical Reporting Model](product/critical-reporting-model.md)
- [Project Lifecycle and Import / Export](product/project-lifecycle-and-import-export.md)
- [Implementation Status Map](product/implementation-status-map.md)

The active stack-detachment and export-deferral decision is [ADR-012: Product Trial Foundation and Project Export Deferral](adr/ADR-012-product-trial-foundation-and-export-deferral.md). Earlier candidate/export documents remain technical history rather than delivery prerequisites.

The application user types are Tier 1, Tier 2, and Tier 3 only. Do not infer current runtime behaviour from product direction; use the implementation status map, source, migrations, tests, and current PR evidence.
