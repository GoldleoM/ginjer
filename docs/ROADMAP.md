# Ginjer application scope

## Implemented

- Reference sign-in and four-tab preview, with isolated fixtures.
- Live authenticated organizations, projects, device details, and module listing from the supplied Postman operations.
- Shared organization/project scope, refreshed tokens, cancellation, session expiry, and native session restoration.
- Searchable current/archived devices, resolved hardware/network metadata, complete outputs/attributes, and visible identifiers.
- Device packet history with date ranges and pagination, activity logs, latest packet radio data, refresh controls, and distinct error/empty states.
- Analytics from actual current readings and attributes, plus a searchable module catalog.
- Real-coordinate maps with pan/zoom, fit, overlapping-device selection, and missing-coordinate lists.
- Compact/expanded device lists, name/last-heard sorting, and device-ID search.
- Downlink form from device details and map cards: controller, plain-text value, port, class, and network-key selection. No command is sent merely by opening the panel.
- In-app notification banners and a searchable, status-filtered notification panel with scope-safe device routing. Polling refreshes the selected project every minute while the app is active.
- Automation summary, searchable rules, conditions, linked devices, configured command steps, and paginated run history. Rule configuration and execution remain read only.
- Device health panel with configurable 1-hour, 24-hour, or 7-day last-heard windows; unknown timestamps, red readings, missing outputs, and missing location checks. These are data-quality/activity indicators, not proof that a device is online or offline.
- Numeric historical charts with minimum/average/maximum and selectable samples for the currently loaded history page.
- Sign-up form connected to the existing backend, with password confirmation and a return-to-sign-in flow. Existing organization access still requires an administrator invitation.
- Live profile name editing, persisted without overwriting refreshed authentication tokens; shared organization/project switching.

## Needs additional backend support

1. Optional device-specific downlink graphics and typed form schemas. The current form matches the official website plain-text controller value; no JSON editor is required.
2. Configured web dashboards, custom analytics widgets, cross-page history aggregation, and digital-twin assets/state mappings.
3. Automation creation/editing/manual runs, notification acknowledgement, and system push notifications. Existing rules and notifications are available in the app; no automation or alert status is modified during inspection.
4. Phone/avatar editing and a user-initiated organization-join request flow. No administrator invitation is issued automatically.
5. WhatsApp health checks/chatbot: server-side Meta credentials, webhook endpoint, approved message templates, recipient consent, and routing contract are required. Credentials must never be bundled in the mobile app.
6. Voice commands, home-screen widgets, and Intellidrip/Airport/Dehn panels: require defined command mappings, native build configuration, and use-case-specific data/contracts.
7. Additional non-LoRaWAN endpoints beyond the supplied project counts and LoRaWAN hardware controller bindings.

## Release verification

- Complete browser and physical-device visual/interaction QA.
- Verify password-based sign-in with working credentials, native cold-start restoration, and expired-session recovery on devices.
- Exercise slow/offline requests, long readings, large projects, and organization switching.
- Select/configure the deployment map tile service.
- Exercise sign-up, profile saves, and one approved downlink on a designated test device. Their requests are covered with mock transports and verified schema definitions; no production mutations or production device commands were performed. Development Busy Light testing is documented below.

The checked-in API documents contain sanitized operation definitions only. Collection tokens and account-specific values remain outside source control. Controlled development Busy Light commands have been tested; the API accepted them, but physical delivery is unresolved. See the investigation in workspace-features-api.md.
