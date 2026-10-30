# Ginjer Mobile

Main application repository for the Ginjer hackathon mobile app, built with Expo, React Native and TypeScript. Run all commands from this repository root.

## Quick start

Use Node.js 22.13 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run web
```

The browser preview works without a phone. To run on Expo Go or a simulator, use `npm start`, `npm run android`, or `npm run ios` (iOS simulator requires macOS).

Optionally copy `.env.example` to `.env` to override the public GraphQL endpoint. Never put secrets in Expo public variables.

## Current behavior

The app opens with the supplied sign-in design. Fields start empty. Login validates input and calls the documented SignIn operation, with loading, timeout and error feedback. Success opens the device list with clearly marked sample data. Device, profile, analytics and locations API integration remain future work. Profile editing and organization/project selection currently use session-only sample data.

Native tokens use Expo SecureStore. Browser tokens stay in memory and are cleared on refresh; passwords are never persisted. Automatic session restoration is not implemented. No production credentials or collection tokens are included.

## Preview device pages

Run `npm run web` and select **Preview device screens** on the sign-in page. No credentials or API connection are needed for this preview.

- Search devices by name or hardware ID; use the filter icon for recent/attention sample filters.
- Open any device card to view its details. Busylight matches the supplied four-output reference.
- Select output cards to move the selection highlight.
- Select View Map or the marker to display the sample location card; close it with the X.
- Use Back to return to the list, or Exit preview to return to sign-in.

Device thumbnails, the map background and location illustration come from the supplied Figma archive. All device values and timestamps are fixtures in `src/features/devices/data/demoDevices.ts`. The map is a static design asset, not a live map: its reference geography does not match the sample Central Park coordinates. Directions and notifications integrations are deferred. Analytics and Locations use sample data. No device commands or device API requests are sent.

## Preview profile pages

From **Preview device screens**, select the **Profile** tab.

- **My Profile** opens the edit screen. Edit first/last name, email, primary phone, optional secondary phone, and organization; the checkmark saves, and Back discards the draft.
- Validation highlights invalid fields and focuses the first error. The avatar pencil lets you choose a default avatar or your initials.
- **Organizations** opens a searchable bottom sheet with SenRa, Individual, and SenRa IoT. Changing organization clears the previous project.
- **Projects** opens sample projects belonging to the selected organization.
- Changes survive switching tabs, and reset when you exit, sign out, or reload. **Logout** uses the existing sign-out flow (or exits the credential-free preview).

Profile fixtures live in `src/features/profile/data/demoProfile.ts`. The `ProfileRepository` interface in `src/features/profile/types.ts` supplies asynchronous load/save and organization/project listing. `createDemoProfileRepository` creates an isolated in-memory adapter per session; replace that adapter with backend calls later. No profile API requests are made. Selecting a sample organization/project currently affects the profile context only; the device list remains its independent fixture set.

## Preview analytics

From **Preview device screens**, select **Analytics** in the bottom navigation.

- The Public Dashboard follows the supplied reference: waste-bin fill level (1.00 on a 0–1.3 scale), desk occupancy, and two valve status cards.
- Use the dashboard dropdown to switch to the Office Dashboard. The selection survives switching tabs for the current session.
- Cards scroll independently of the dashboard selector and bottom navigation.
- Each information icon opens the metric description, device ID, and recorded time. Reference timestamps are historical sample values displayed in IST.
- Loading, empty, and retry states are supported. No live telemetry or device commands are connected.

Typed fixtures are in `src/features/analytics/data/demoAnalytics.ts`. Screens use the asynchronous `AnalyticsRepository` interface; replace `demoAnalyticsRepository` with backend calls when the dashboard endpoints are ready. The gauge uses native views and adds no chart dependencies.

## Preview locations

From **Preview device screens**, select **Locations** in the bottom navigation.

- The static India map is original artwork extracted from the supplied Figma archive.
- Ten sample markers reproduce the reference's bin, temperature, water, and cold-chain symbols with colored halos.
- Search by device name or hardware ID. Filters show bin sensors, temperature sensors, other sensors, or devices needing attention.
- Tap a marker to open its device card with thumbnail, name, ID, activity, and reading badges. Tap the same marker or the map to close it.
- The card arrow opens the existing device-details page; Back returns to the map with its search, filter, and selection intact.
- The bell opens an empty sample-notifications dialog. Loading, retry, and empty-result states are supported.

Fixtures live in `src/features/locations/data/demoLocations.ts`; the asynchronous `LocationsRepository` interface supplies devices separately from the UI. Positions are normalized display points tied to the reference image crop, not GPS coordinates. Live map tiles, pan/zoom, and real geolocation are future work and will require replacing the static map renderer as well as the data adapter. No map service or location permission is needed for this preview.

## Structure

- `App.tsx`: Expo entry point.
- `src/app/`: application composition and authenticated state.
- `src/features/auth/`: sign-in screen, validation, service and types.
- `src/features/devices/`: device page navigation, list/detail screens, reusable UI, typed sample fixtures.
- `src/features/locations/`: static map preview, device markers/cards, local search/filtering, fixtures, and repository interface.
- `src/features/analytics/`: dashboard screen, gauge/status cards, typed sample dashboards, and repository interface.
- `src/features/profile/`: profile/edit screens, searchable selection sheets, validation, typed fixtures, and repository interface.
- `src/components/`: shared input components.
- `src/services/`: GraphQL transport and platform-aware session storage.
- `src/config/` and `src/theme/`: environment configuration and visual tokens.
- `assets/images/`: supplied Ginjer logo and reference illustration.
- `docs/`: agreed roadmap and sanitized GraphQL query definitions.
- `tests/`: credential and profile validation tests.

## Checks

```sh
npm run typecheck
npm test
npm run build:web
```

Live sign-in requires company test credentials and network access. Browser requests depend on the API's CORS policy. Native device appearance and live authentication still need verification. The illustration is a raster crop of the reference; use the original export when available. Legal URLs inherited from the original implementation need company confirmation before release.

Target repository: https://github.com/GoldleoM/ginjer.git

## Device-page verification

Passed: TypeScript, existing 3 validation tests, web export and Android Hermes export. Browser visual/interaction QA remains outstanding because the browser automation host was unavailable. Native device QA and live API testing remain outstanding.


## Profile-page verification

Passed: TypeScript, all 7 validation tests, in-memory repository checks (draft isolation, normalized saves, defensive copies, project scoping, session reset), and web export. Browser visual/interaction QA remains outstanding because the browser access host is unavailable. Native device QA remains outstanding.

## Analytics verification

Passed: TypeScript, all 7 existing validation tests, analytics data checks (dashboard switching, reference values, timestamps, gauge ranges, defensive copies, missing dashboards), web export, and Android Hermes export. Browser visual/interaction QA remains outstanding because the browser access host is unavailable. Native device QA remains outstanding.
