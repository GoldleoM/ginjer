# Workspace features and API contracts

Verified against the Ginjer schema on 2026-10-30. Both development and production expose the operations below. Requests use the existing shared API URL and authenticated transport, including raw authorization headers, token rotation, session expiry, and cancellation of read requests.

## Notifications and automation

`alerts(alertParamsInput: AlertParamsInput!)` and `triggeredAlerts(triggeredAlertParamsInput: TriggeredAlertParamsInput!)` both accept `organisationId` and `projectId`. Responses are filtered to the current organization/project. Rules include enabled status, trigger types, conditions, schedule name, action device/interface references, and cluster device references. Notifications include `ACTIVE`, `ACKNOWLEDGED`, or `ARCHIVED` status, `timeStamp`, trigger count, output values, and an optional device reference.

Only exact device ID + organization ID + project ID matches are navigable. Missing or inaccessible devices remain explicitly unavailable. Banners show active returned notifications; dismissing a banner is local UI state and does not acknowledge the backend alert. The panel filters the returned `triggeredAlerts` feed; it does not claim to represent an unlimited historical archive. Backend errors remain distinct from empty feeds.

`automationRuns(automationRunsParams: AutomationRunsInput!)` takes `alertId` and `pageInfo: { pageNo, noOfRecordsPerPage }`. Pages are one based, with 20 records per request. Parent organization/rule identity is validated, and run records must match the selected organization, project, and rule. The UI displays state, trigger, timestamps, step, skipped triggers, and abort/cancellation reasons. No rule is toggled, run, created, or deleted by viewing these screens.

## Downlinks

Discovery combines:

- `hardwareList(params: { organisationId })`: the device's exact hardware, its ownership/deleted state, and `loRaWANConfiguration.controllers.moduleId`.
- `modules(params: { organisationId })`: labels for compatible `DOWNLINK_INTERFACE` IDs only; shared and current-organization modules are accepted.
- `getFavoriteDownlinks(favoriteDownlinkParamsInput: { deviceId })`: exact device/organization-matched saved commands, with interface ID, JSON-encoded `value`, port, device class, and network-key identifier. The network key itself is neither requested nor exposed.

Saved values are parsed as JSON objects. Classes are the actual API enum values `CLASS_A`, `CLASS_B`, and `CLASS_C`; ports must be integers from 1 to 223. Malformed or foreign commands are excluded. Discovery requests never submit commands and never retrieve or evaluate controller source code.

The send operation is a **GraphQL query with side effects**, as specified by Postman:

```graphql
query SendDownlink($action: SendDownlinkInput!) {
  sendDownlink(action: $action) { timestamp type message }
}
```

The action includes `organisationId`, `deviceId`, `downlinkInterfaceId`, and the JSON object `value`. Saved commands retain their port, class, and network-key ID; custom commands optionally specify a port and otherwise use the interface defaults. Options must match the current device, organization, and hardware before sending. Archived/demo devices cannot send. There are no automatic retries. The sheet blocks repeated taps and further submissions after a request; ambiguous network outcomes direct users to inspect logs before trying again. The response message is shown verbatim as a server response, never treated as proof of physical delivery.

The API has no form schema for the reference Valve/Value dropdowns. The UI uses exact saved commands or an explicitly labeled custom JSON editor; it does not invent keys or enum values. Animated cloud feedback indicates an in-progress API request, not a simulated physical device state.

## Account creation and profile names

`signUp(user: SignUpInput!)` is an unauthenticated mutation. The form submits first name, last name, email, password, and `application: Ginjer`. Confirmation stays client-side. The response requests only ID/email/verification state; successful registration returns the user to sign-in. It does not create or select an organization or send invitations.

`updateUserProfile(editUserInput: EditUserInput!)` is an authenticated mutation. Only the signed-in user ID and trimmed first/last names are sent. The returned identity must match the current user. Other fields, roles, passwords, and organization settings are omitted. Local session identity is updated separately from token storage so concurrent token rotation is preserved.

## Verification and limits

- The app's actual transport/adapters successfully read eight accessible project scopes: six rules, seven notifications, and ten supported interfaces across the sampled devices. Run-history reads succeeded with zero runs returned for the sampled rules.
- Both development and production schemas expose all seven integrated operations (`alerts`, `triggeredAlerts`, `automationRuns`, `getFavoriteDownlinks`, `sendDownlink`, `signUp`, `updateUserProfile`).
- Automated tests cover request fields, scope isolation, permission failures, timestamps, sorting, payload validation, preserved false/zero values, mutation identity checks, and ambiguous command responses.
- No production command, account creation, profile update, or automation change was executed for testing. Write operations still need a controlled acceptance test with the intended account/device.
- Browser access was unavailable, so browser and physical-device interaction/visual QA remain pending.

Health indicators use the existing last-heard timestamp and readings, not a backend health guarantee. History charts include only numeric outputs from the currently loaded page; booleans, missing values, invalid timestamps, and foreign-device packets are excluded. Charts explicitly label this scope.
