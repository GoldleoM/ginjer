# Ginjer Mobile

Expo / React Native / TypeScript application with a live Ginjer workspace and a separate design preview.

## Run

Use Node.js 22.13 or newer.

```sh
npm ci
npm run web
```

Use `npm start` for Expo Go, `npm run android` for Android, or `npm run ios` on macOS.

Public configuration is documented in `.env.example`. Copy it to `.env` to customize API hosts. Development builds (`npm start`, `npm run web`, Android/iOS development) use `EXPO_PUBLIC_DEV_API_BASE_URL`, defaulting to `https://devapi.ginjer.io`. Production builds/exports use `EXPO_PUBLIC_PROD_API_BASE_URL`, defaulting to `https://prodapi.ginjer.io`. The shared `API_BASE_URL` removes trailing slashes and appends `/graphql` for all API calls.

Set `EXPO_PUBLIC_API_BASE_URL` to override the base URL in either build type. The existing `EXPO_PUBLIC_API_URL` full-endpoint override remains supported and takes precedence. Restart Expo after changing configuration; production changes require a new build/export. Never put tokens, passwords, or private keys in Expo public environment variables.

## Live application

Sign in with your Ginjer account to open **Projects**. The app loads accessible organizations, selects an active accepted membership, and lists its projects without choosing one automatically. Search by project name, description, or location, then open a project to load its devices. Return with the Projects tab or project selector; returning clears the selected scope and cancels its pending device requests.

Project cards show live names, device counts, cluster/member counts, and read-only enabled status. There is no Add Project action. Creation dates and online/total device ratios are not returned by the supplied collection and are not fabricated.

- The workspace bar switches organizations and returns to the Projects list across Devices, Locations, Analytics, and Profile. The information button shows project description, status, membership/device/cluster counts, non-LoRaWAN device count, location, and IDs.
- **Devices** shows real names, hardware IDs, clusters, latest readings, and recorded timestamps. Search by name, hardware ID, DevEUI, or cluster. Filters include current/archived devices, readings recorded in the last 24 hours, and explicitly red-colored outputs. Switch between compact rows and expanded cards, and sort by name or last-heard time.
- **Device Details** includes resolved hardware/manufacturer/model/network/tag information, the configured main output, all outputs and attributes, coordinates, latest radio packet details, and visible identifiers. Its History tab loads paginated received packets with time filters and expandable payloads. Its Logs tab separately loads device activity messages, including honest empty/error states. History also offers numeric charts with selectable samples and summary statistics for the loaded page. Pull to refresh or use the refresh button.
- **Locations** uses actual returned coordinates with pan/zoom, fit-to-devices, grouped markers, device cards, and detail navigation. Devices without valid coordinates remain available in a separate searchable list. Coordinate values of zero are valid. Selected device cards also open the Send Downlink sheet.
- **Analytics** displays the latest reported outputs and attributes, with search and links back to devices. Historical numeric charts are available in each device's History tab; configured dashboards are not invented. The Modules catalog shows the returned module labels, types, IDs, and ownership, with searchable virtualized lists.
- **Profile** displays the signed-in identity and membership role, and uses the same organization/project selection as the other tabs. Edit the signed-in user's first and last name; saved names update the shared identity without replacing refreshed tokens.
- Refresh, loading, retry, permission/session errors, and empty states are included. Requests from an old scope are cancelled; responses from a previous signed-in session cannot update the current token.

- **Send Downlink** opens from device details or a selected map card. It discovers hardware-supported interfaces and saved commands; custom commands use a validated JSON editor because the API provides no device-specific form definitions. Sending occurs only on the user's Send action; the sheet prevents duplicate taps and shows the server's response.
- **Notifications** provides active banners, search/status filters, and links to matching devices. It refreshes the selected project once a minute while active.
- **Automation** shows configured rules, summary counts, conditions, linked devices, command steps, and paginated run history. Rule editing and manual execution are not exposed.
- **Health** checks last-heard windows, red readings, missing outputs, and missing coordinates. It distinguishes unknown timestamps and does not infer that a device is offline.
- **Create account** uses the existing sign-up API, with password confirmation and a return-to-sign-in flow. Access to an existing organization requires an administrator invitation.

The supplied collection omits several available operations. Live schema inspection verified the additional history, notifications, automation, saved-command, and account APIs. See [device inspection](docs/device-inspection-api.md), [feature API contracts and verification](docs/workspace-features-api.md), and the [remaining roadmap](docs/ROADMAP.md). No production mutations or device commands were executed during development.

## Sessions

Native sessions use Expo SecureStore and restore the saved identity on app startup. Web sessions stay in memory and require sign-in after a browser reload. Passwords are never persisted.

Authenticated requests use the collection's raw `authorization` header. Ginjer's refreshed response token is saved automatically. HTTP/GraphQL authentication failures clear the session and return to sign-in. Session changes serialize secure-storage writes and reject late responses.

The Postman file remains outside the repository. Only sanitized query definitions are in `docs/api-operations.json`; its token and example account values are not embedded in the app.

## Maps

Live maps load only visible OpenStreetMap raster tiles, identify the native app, use normal HTTP caching, and show attribution. Tile URLs can be changed with `EXPO_PUBLIC_MAP_TILE_URL` (a template containing `{z}`, `{x}`, and `{y}`). There is no bulk download or offline-prefetch feature. Tile failures preserve device data and coordinates.

OpenStreetMap's public service has its own [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Configure a suitable tile service for deployment needs.

## Design preview

Choose **Preview app** on the sign-in page to review the original reference screens without credentials. All four tabs are available, including temporary profile editing, public/office sample dashboards, and the static India reference map.

Preview values and map positions are fixtures. They never replace failed or missing live API responses. The preview's account changes last only for that preview session.

## Structure

- `src/app/`: startup/session state, preview navigation, live navigation.
- `src/features/workspace/`: live API adapters, response normalization, shared workspace state, selectors, connected screens, and coordinate map.
- `src/features/auth/`: sign-in, validation, session creation.
- `src/features/devices/`, `profile/`, `analytics/`, `locations/`: reference screens, common device types/components, and typed preview fixtures.
- `src/services/`: GraphQL transport and platform-aware session storage.
- `tests/`: credential/profile validation, response mapping, authentication/transport behavior, and map geometry.
- `assets/images/`: original design assets.

## Responsive layouts

The web app and native screens share layouts that respond to available width, orientation, safe-area insets, and native text scaling. Device and analytics lists use one to three columns; outputs use up to four. Profile forms stay within a readable width and use two columns where space permits. Tablet split-screen windows use their actual container width. Native builds support portrait and landscape.

The sign-in form, list controls, map filters, and dialogs scroll when space is limited. Bottom navigation remains outside the screen's scrolling content. The web shell uses dynamic viewport height to follow mobile browser chrome and allows browser zoom.

Layout regression tests cover widths from 240 to 1600 pixels, including common phone, iPad mini, iPad Air/Pro, Android tablet, landscape, and split-screen sizes, with text scaling up to 200%. These calculation tests do not replace browser or physical-device QA.

## Verification

```sh
npm run typecheck
npm test
npm run build:web
npx expo export --platform android --output-dir .preview/android
```

Validation includes TypeScript, 65 automated tests, and live read-only checks using the app's transport/adapters across two accessible organizations and eight project scopes, including rules, notifications, hardware-bound downlink discovery, and run history. Refreshed tokens were handled, and the API's browser CORS preflight allowed the required headers.

Browser visual/interaction QA is pending because the browser access host is unavailable. Password-based sign-in could not be exercised with the collection's empty password; live integration was verified using its supplied token. Physical-device QA, background/foreground network behavior, and deployment testing remain outstanding.

Repository: https://github.com/GoldleoM/ginjer.git
