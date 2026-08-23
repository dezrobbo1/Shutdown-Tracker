# ADR-003: Frontend and Mobile

Status: Draft

## Context

Shutdown Tracker is one platform that needs two task-appropriate client applications:

- a Tier 1 desktop/control-room Master Console; and
- a Tier 2/Tier 3 Mobile App for explicitly assigned field work.

The clients share one backend, identity boundary, project state, domain model, and audit model. Those shared services do not make the clients one responsive application, and neither client should reproduce the other client's information architecture.

The client boundary is approved in [Product Flow and Software Map](../product/product-flow-and-software-map.md). This ADR remains Draft while installable-channel and packaging mechanics remain implementation choices rather than accepted architecture.

## Decision

Build the Master Console and Mobile App as separate application clients over the shared Shutdown Tracker platform. A common web technology foundation may be used, but each client has its own entry points, routes, navigation, authorization boundary, and task-appropriate presentation.

The product delivery requirement is:

- **Master Console:** Tier 1-only, desktop-optimised project-control application with whole-project visibility and operational update authority. Installable desktop delivery may be supported as a channel over the same platform.
- **Mobile App:** Tier 2/Tier 3-only, mobile-optimised satellite field application. It exposes Assigned Tasks and the relevant Task Detail only, and never grants whole-project browsing. Browser/PWA and installable iOS/Android delivery may be supported as channels over the same platform.

The same OIDC-authenticated identity, project membership records, explicit assignments, execution records, review state, and audit model apply regardless of whether a client is opened in a browser or an installed channel.

The Master Console remains desktop-first even when browser-delivered. It is not required to reproduce Mobile App routes or controls on a phone-sized screen. The Mobile App is not a mobile or responsive version of the Console and must not reproduce the whole-project control-room workspace.

Mobile sync remains a visible transport/recovery state within assigned work. It is not a separate operational destination.

The current React/Vite implementation may remain the shared web foundation. The exact packaging technology for installed desktop or mobile delivery is an implementation decision and may evolve without changing this product boundary.

## Consequences

- Browser access is a product requirement for both application experiences.
- Installable desktop and iOS/Android delivery are supported channels for the corresponding client, not new clients with separate domain rules.
- Shared platform/API/domain contracts remain authoritative across delivery channels.
- Offline-capable behavior can continue to use browser/PWA foundations while installed channels may add justified device integration.
- Device-specific capabilities may differ for camera/evidence capture, local/offline storage, notifications, background sync, and similar platform integration.
- Installed delivery must not fork tier authority, explicit-assignment rules, schedule authority, approval/export rules, or execution-state semantics.
- Native-only functionality is not required merely to claim an installable channel; packaging technology should be selected when implementation requirements justify it.
- Tier 1 uses the Console only. Tier 2 and Tier 3 use the Mobile App only, with access derived from active membership and explicit assignments.
- Project classifications, categories, saved views, and Critical membership do not expand Mobile access.
