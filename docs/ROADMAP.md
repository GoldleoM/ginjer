# Ginjer application scope

This repository is the main React Native application. The supplied conversation establishes sign-in as the first screen, with browser preview support. Future screens will be implemented from their supplied designs.

## Current milestone

- Ginjer sign-in reference, logo, illustration, responsive layout and keyboard handling.
- Email validation, password visibility, loading and error states.
- Postman GraphQL sign-in and native secure token storage.
- Browser preview with an in-memory session.
- Temporary signed-in welcome screen and sign out.

## Next milestones

1. Organisation selection using accounts.
2. Project overview using projectOverview.
3. Devices grouped by project and cluster.
4. Device details, outputs, attributes and location.
5. Modules and device commands after the company supplies downlink payload specifications.

The sanitized api-operations.json contains only query definitions from the supplied collection. It excludes tokens, credentials and account-specific values. There are no documented alerts/history endpoints. Do not send example downlinks to production.
