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

The app opens with the supplied sign-in design. Fields start empty. Login validates input and calls the documented SignIn operation, with loading, timeout and error feedback. Success displays a temporary welcome screen with sign out. Organisation and device screens are subsequent milestones, not yet implemented.

Native tokens use Expo SecureStore. Browser tokens stay in memory and are cleared on refresh; passwords are never persisted. Automatic session restoration is not implemented. No production credentials or collection tokens are included.

## Structure

- `App.tsx`: Expo entry point.
- `src/app/`: application composition and authenticated state.
- `src/features/auth/`: sign-in screen, validation, service and types.
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

Live sign-in requires company test credentials and network access. Browser requests depend on the API?s CORS policy. Native device appearance and live authentication still need verification. The illustration is a raster crop of the reference; use the original export when available. Legal URLs inherited from the original implementation need company confirmation before release.

Target repository: https://github.com/GoldleoM/ginjer.git
