# Ginjer application scope

This repository is the main React Native application. The supplied conversation establishes sign-in as the first screen, with browser preview support. Future screens will be implemented from their supplied designs.

## Current milestone

- Ginjer sign-in reference, logo, illustration, responsive layout and keyboard handling.
- Email validation, password visibility, loading and error states.
- Postman GraphQL sign-in and native secure token storage.
- Browser preview with an in-memory session.
- Device list and details UI based on the supplied references, using typed sample data.
- Local search, sample filters, output selection and map card open/close states.
- Preview entry from sign-in, device navigation and sign out.
- Original device/map artwork extracted from the supplied Figma archive.
- Profile and edit-profile screens with inline validation, session-only saves, avatar choices, and searchable organization/project selection.
- Analytics dashboards with a native fill-level gauge, occupancy/valve status cards, metric details, and session-only dashboard selection.
- Locations map preview using original India artwork, searchable/filterable markers, device info cards, and device-details navigation.

## Next milestones

1. Connect profile loading/saving and organisation selection to backend accounts APIs.
2. Project overview using projectOverview.
3. Connect the device list to project/cluster APIs.
4. Connect device details/outputs/attributes to APIs and replace the static map preview with live location.
5. Connect analytics dashboards and metric readings to backend APIs.
6. Connect Locations to real coordinates and a live map renderer.
7. Modules and device commands after the company supplies downlink payload specifications.

The sanitized api-operations.json contains only query definitions from the supplied collection. It excludes tokens, credentials and account-specific values. There are no documented alerts/history endpoints. Do not send example downlinks to production.
