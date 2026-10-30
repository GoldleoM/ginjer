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
- `networkList(params: { organisationId })`: match the device network and read `configuration.httpOptions.networkKeys { _id name }`. Secret key material is never requested.

The form sends the controller value as plain text, matching the official web implementation. The default port is 1 and default class is C. Classes are the actual API enum values `CLASS_A`, `CLASS_B`, and `CLASS_C`; ports must be integers from 1 to 223. Key choices are restricted to the device network and organization. Discovery requests never submit commands and never retrieve or evaluate controller source code.

The send operation is a **GraphQL query with side effects**, as specified by Postman:

```graphql
query SendDownlink($action: SendDownlinkInput!) {
  sendDownlink(action: $action) { timestamp type message }
}
```

The action includes `organisationId`, `deviceId`, `downlinkInterfaceId`, plain-text `value`, `port`, `class`, `networkKeyId`, and the official website timeout of `1000`. Options must match the current device, organization, and hardware before sending. Archived/demo devices cannot send. There are no automatic retries. The sheet blocks duplicate submissions; ambiguous outcomes direct users to inspect logs. Nested network statuses 200/201/202 are shown as accepted, while rejection and parsing responses are errors. Other responses remain unconfirmed. A response is not proof of physical delivery. The configured key is never silently replaced if it no longer exists.

The UI matches the official website: controller dropdown, controller value text field, port, class, and key selector. It does not require JSON or execute controller source code. Saved-command selection is not shown.

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

### Busy Light delivery investigation (2026-10-30)

A user-observed development test submitted Off and restored Blue using the same API adapter as the app, port 1, Class C, and the configured network key. The backend accepted both requests (nested status 200), but the user reported no physical change. Delivery remains unverified; compare the exact working website device URL and input before further commands. No production API commands were sent.
