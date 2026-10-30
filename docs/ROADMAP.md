# Ginjer application scope

## Implemented

- Reference sign-in and four-tab preview, with isolated fixtures.
- Live authenticated organizations, projects, device details, and module listing from the supplied Postman operations.
- Shared organization/project scope, refreshed tokens, cancellation, session expiry, and native session restoration.
- Searchable current/archived devices, resolved hardware/network metadata, complete outputs/attributes, and visible identifiers.
- Device packet history with date ranges and pagination, activity logs, latest packet radio data, refresh controls, and distinct error/empty states.
- Analytics from actual current readings and attributes, plus a searchable module catalog.
- Real-coordinate maps with pan/zoom, fit, overlapping-device selection, and missing-coordinate lists.
- Read-only live profile identity and membership details.

## Needs additional backend support

1. Profile updates and phone/avatar fields.
2. Configured dashboard/module bindings and historical analytics charts beyond the implemented packet-history list.
3. Notification feeds and alert history.
4. Downlink interface discovery, payload schemas, and command permission/confirmation requirements.
5. Any additional non-LoRaWAN device endpoints beyond the provided project counts.

## Release verification

- Complete browser and physical-device visual/interaction QA.
- Verify password-based sign-in with working credentials, native cold-start restoration, and expired-session recovery on devices.
- Exercise slow/offline requests, long readings, large projects, and organization switching.
- Select/configure the deployment map tile service.

The sanitized operations document contains query definitions only. Collection tokens and account-specific values remain outside source control. No downlinks have been sent.
