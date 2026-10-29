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

The app opens with the supplied sign-in design. Fields start empty. Login validates input and calls the documented SignIn operation, with loading, timeout and error feedback. Success opens the device list with clearly marked sample data. Device API integration, organisation and project selection remain future work.

Native tokens use Expo SecureStore. Browser tokens stay in memory and are cleared on refresh; passwords are never persisted. Automatic session restoration is not implemented. No production credentials or collection tokens are included.

## Preview device pages

Run `npm run web` and select **Preview device screens** on the sign-in page. No credentials or API connection are needed for this preview.

- Search devices by name or hardware ID; use the filter icon for recent/attention sample filters.
- Open any device card to view its details. Busylight matches the supplied four-output reference.
- Select output cards to move the selection highlight.
- Select View Map or the marker to display the sample location card; close it with the X.
- Use Back to return to the list, or Exit preview to return to sign-in.

Device thumbnails, the map background and location illustration come from the supplied Figma archive. All device values and timestamps are fixtures in `src/features/devices/data/demoDevices.ts`. The map is a static design asset, not a live map: its reference geography does not match the sample Central Park coordinates. Directions, notifications, Locations and Analytics integrations are deferred; the inactive tabs are marked as coming soon. No device commands or device API requests are sent.

## Structure

- `App.tsx`: Expo entry point.
- `src/app/`: application composition and authenticated state.
- `src/features/auth/`: sign-in screen, validation, service and types.
- `src/features/devices/`: device page navigation, list/detail screens, reusable UI, typed sample fixtures.
- `src/components/`: shared input components.
- `src/services/`: GraphQL transport and platform-aware session storage.
- `src/config/` and `src/theme/`: environment configuration and visual tokens.
- `assets/images/`: supplied Ginjer logo and reference illustration.
- `docs/`: agreed roadmap and sanitized GraphQL query definitions.
- `tests/`: credential validation tests.

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
