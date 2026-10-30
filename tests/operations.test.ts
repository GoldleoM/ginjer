import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ApiRequest } from '../src/services/graphqlTransport.ts';
import { ApiError, createGraphqlTransport } from '../src/services/graphqlTransport.ts';
import { normalizeDevices } from '../src/features/workspace/services/normalizers.ts';
import { createOperationsApi, normalizeNotifications, normalizeRules, notificationDevice } from '../src/features/workspace/services/operations.ts';
import { createDownlinkApi, downlinkAction, normalizeDownlinks, parseCommandValue } from '../src/features/workspace/services/downlinks.ts';
import { deviceHealth, healthSummary, packetTrends, sortDevices } from '../src/features/workspace/services/deviceInsights.ts';
import { normalizePacket } from '../src/features/workspace/services/deviceInspection.ts';
import { createAccountApi, profileInput, registrationInput } from '../src/features/auth/services/accountApi.ts';

const scope = { organisationId: 'org', projectId: 'project' };
const [device] = normalizeDevices([{ _id: 'project', clusters: [{ _id: 'cluster', devices: [{ _id: 'device', organisationId: 'org', projectId: 'project', clusterId: 'cluster', hardwareId: 'hardware', name: 'Sensor', timestamp: '2026-10-30T00:00:00Z', outputs: [{ outputId: 'temperature', outputName: 'Temperature', value: 0 }] }] }] }]);
const hardware = [{ _id: 'hardware', organisationId: null, loRaWANConfiguration: { controllers: [{ moduleId: 'command' }] } }];
const modules = [{ _id: 'command', organisationId: null, moduleType: 'DOWNLINK_INTERFACE', label: 'Valve' }, { _id: 'other', moduleType: 'DOWNLINK_INTERFACE', label: 'Other hardware' }];
const favorite = { _id: 'saved', name: 'Close', deviceId: 'device', organisationId: 'org', downlinkInterfaceId: 'command', port: 10, class: 'CLASS_A', networkKeyId: 'key-id', value: '{"valve":1,"open":false,"duration":0}' };
const options = normalizeDownlinks(device, hardware, modules, [favorite]);
const rule = { _id: 'rule', ...scope, name: 'High temperature', active: false, deleted: false, triggerTypes: ['NEW_MEASUREMENT'], conditions: [{ outputId: 'temperature', conditionType: 'GREATER_THAN', value: '30' }], advanceConditions: [{ deviceId: 'device', downlinkInterfaceId: 'command', active: false }], clusterConfigurations: [{ deviceIds: ['device'] }] };
const notification = { _id: 'alert', ...scope, deviceId: 'device', alertId: 'rule', status: 'ACTIVE', timeStamp: '2026-10-30T00:00:00Z', triggeredCount: 2, outputValues: [{ outputId: 'temperature', outputValue: 0, label: 'Reported' }] };

test('rules are scoped, deduplicated by target and preserve disabled configuration', () => {
  const result = normalizeRules([rule, { ...rule, organisationId: 'other' }, { ...rule, projectId: 'other' }, { ...rule, deleted: true }], scope);
  assert.equal(result.length, 1); assert.equal(result[0].active, false);
  assert.deepEqual(result[0].deviceIds, ['device']); assert.equal(result[0].actions[0].active, false);
  assert.equal(result[0].conditions[0].value, '30');
});
test('notifications filter foreign scopes and sort dates, retaining zero output values', () => {
  const result = normalizeNotifications([notification, { ...notification, _id: 'new', timeStamp: 1793408400000 }, { ...notification, organisationId: 'other' }, { ...notification, status: 'INVALID' }], scope);
  assert.equal(result.length, 2); assert.equal(result[0].id, 'new'); assert.equal(result[1].values[0].value, '0');
  assert.equal(result[1].count, 2);
});
test('notification routing cannot open a matching device ID from another workspace', () => {
  const [item] = normalizeNotifications([notification], scope);
  assert.equal(notificationDevice(item, [device], scope)?.id, device.id);
  assert.equal(notificationDevice(item, [{ ...device, organizationId: 'other' }], scope), undefined);
  assert.equal(notificationDevice(item, [{ ...device, projectId: 'other' }], scope), undefined);
  assert.equal(notificationDevice({ ...item, deviceId: '' }, [device], scope), undefined);
});
test('rules and notification APIs use project scoping and pass cancellation', async () => {
  const signal = new AbortController().signal;
  const calls: { query: string; variables: unknown; signal: unknown }[] = [];
  const request = (async (query, variables, passed) => { calls.push({ query, variables, signal: passed }); return { alerts: [rule], triggeredAlerts: [notification] }; }) as ApiRequest;
  const api = createOperationsApi(request);
  assert.equal((await api.rules(scope, signal)).length, 1); assert.equal((await api.notifications(scope, signal)).length, 1);
  for (const call of calls) { assert.deepEqual(call.variables, { params: scope }); assert.equal(call.signal, signal); }
  assert.match(calls[0].query, /alerts\(alertParamsInput/); assert.match(calls[1].query, /triggeredAlerts\(triggeredAlertParamsInput/);
  await assert.rejects(api.rules({ ...scope, organisationId: '' }));
});
test('run history validates parent identity and filters cross-project records', async () => {
  let parent = 'org'; let variables: unknown;
  const api = createOperationsApi((async (_query, input) => { variables = input; return { automationRuns: { organisationId: parent, alertId: 'rule', metadata: { currentPage: 2, totalPages: 3, totalRecords: 45 }, runs: [
    { _id: 'run', ...scope, alertId: 'rule', state: 'ABORTED', trigger: 'UPLINK', currentStep: 0, skippedTriggers: 0, abortReason: 'STEP_FAILED', triggeredAt: '2026-10-30T00:00:00Z' },
    { _id: 'foreign', ...scope, projectId: 'other', alertId: 'rule' },
  ] } }; }) as ApiRequest);
  const result = await api.runs(scope, 'rule', 2);
  assert.equal(result.runs.length, 1); assert.equal(result.runs[0].currentStep, 0); assert.equal(result.runs[0].abortReason, 'STEP_FAILED'); assert.equal(result.pages, 3);
  assert.deepEqual(variables, { params: { alertId: 'rule', pageInfo: { pageNo: 2, noOfRecordsPerPage: 20 } } });
  parent = 'other'; await assert.rejects(api.runs(scope, 'rule', 1), /match/);
  await assert.rejects(api.runs(scope, 'rule', 0));
});
test('a permission failure stays an error instead of looking like an empty notification feed', async () => {
  const request = createGraphqlTransport({ url: 'https://api.example.test/graphql', getToken: async () => 'token', saveToken: async () => {}, onExpired: async () => {}, fetcher: (async () => new Response('{}', { status: 403 })) as typeof fetch });
  await assert.rejects(createOperationsApi(request).notifications(scope), error => error instanceof ApiError && error.code === 'permission');
});
test('downlink interfaces are bound to the device hardware and saved commands retain exact values', () => {
  assert.deepEqual(options.interfaces, [{ id: 'command', name: 'Valve' }]);
  assert.deepEqual(options.commands[0].value, { valve: 1, open: false, duration: 0 });
  assert.equal(options.commands[0].deviceClass, 'CLASS_A');
  assert.equal(normalizeDownlinks(device, [{ ...hardware[0], organisationId: 'other' }], modules, [favorite]).interfaces.length, 0);
  assert.equal(normalizeDownlinks(device, [{ ...hardware[0], deleted: true }], modules, [favorite]).interfaces.length, 0);
  assert.equal(normalizeDownlinks(device, hardware, [{ ...modules[0], organisationId: 'other' }], [favorite]).interfaces.length, 0);
});
test('saved commands for other devices or organizations never appear', () => {
  const result = normalizeDownlinks(device, hardware, modules, [{ ...favorite, deviceId: 'other' }, { ...favorite, organisationId: 'other' }, { ...favorite, downlinkInterfaceId: 'other' }]);
  assert.deepEqual(result.commands, []);
});
test('malformed saved commands are excluded with a visible warning', () => {
  const result = normalizeDownlinks(device, hardware, modules, [{ ...favorite, value: 'not JSON' }, { ...favorite, port: 0 }, { ...favorite, class: 'A' }]);
  assert.equal(result.commands.length, 0); assert.equal(result.warnings.length, 1);
});
test('custom JSON accepts objects and rejects non-objects, overflow and oversized content', () => {
  assert.deepEqual(parseCommandValue('{"zero":0,"disabled":false,"nested":{"x":null}}'), { zero: 0, disabled: false, nested: { x: null } });
  assert.deepEqual(parseCommandValue('{}'), {});
  for (const value of ['', '[]', 'null', 'true', '1', '"string"', '{"x":1e400}', '{"x":"' + 'x'.repeat(33000) + '"}']) assert.throws(() => parseCommandValue(value));
});
test('send guard rejects archived, preview, foreign options and unsupported interfaces', () => {
  const draft = { interfaceId: 'command', value: {} };
  for (const invalid of [{ ...device, deleted: true }, { ...device, source: 'demo' as const }, { ...device, organizationId: '' }, { ...device, id: 'other' }]) assert.throws(() => downlinkAction(invalid, draft, options));
  assert.throws(() => downlinkAction(device, { ...draft, interfaceId: 'other' }, options));
  for (const port of [0, 224, -1, 2.5, NaN]) assert.throws(() => downlinkAction(device, { ...draft, port }, options));
  assert.deepEqual(downlinkAction(device, draft, options), { organisationId: 'org', deviceId: 'device', downlinkInterfaceId: 'command', value: {} });
});
test('downlink discovery never sends commands and tolerates a saved-command read failure', async () => {
  const queries: string[] = [];
  const api = createDownlinkApi((async query => {
    queries.push(query); if (query.includes('getFavoriteDownlinks')) throw new Error('Forbidden');
    return query.includes('hardwareList') ? { hardwareList: hardware } : { modules };
  }) as ApiRequest);
  const result = await api.options(device);
  assert.equal(result.interfaces.length, 1); assert.equal(result.commands.length, 0); assert.equal(result.warnings.length, 1);
  assert.ok(queries.every(query => !query.includes('sendDownlink(')));
});
test('send uses the documented query and exact saved command fields without a retry', async () => {
  let calls = 0; let captured: unknown;
  const api = createDownlinkApi((async (query, variables) => { calls++; assert.match(query, /query SendDownlink/); captured = variables; return { sendDownlink: { type: 'Downlink', message: 'Queued' } }; }) as ApiRequest);
  const saved = options.commands[0];
  const result = await api.send(device, { interfaceId: saved.interfaceId, value: saved.value, port: saved.port, deviceClass: saved.deviceClass, networkKeyId: saved.networkKeyId }, options);
  assert.equal(result.message, 'Queued'); assert.equal(calls, 1);
  assert.deepEqual(captured, { action: { organisationId: 'org', deviceId: 'device', downlinkInterfaceId: 'command', value: { valve: 1, open: false, duration: 0 }, port: 10, class: 'CLASS_A', networkKeyId: 'key-id' } });
  const failure = createDownlinkApi((async () => { calls++; throw new Error('Network'); }) as ApiRequest);
  await assert.rejects(failure.send(device, { interfaceId: 'command', value: {} }, options)); assert.equal(calls, 2);
});
test('ambiguous downlink responses cannot be mistaken for delivery confirmation', async () => {
  const api = createDownlinkApi((async () => ({ sendDownlink: null })) as ApiRequest);
  await assert.rejects(api.send(device, { interfaceId: 'command', value: {} }, options), /did not confirm/);
});
test('health uses explicit windows, excludes archived devices and separates unknown timestamps', () => {
  const now = Date.parse('2026-10-31T01:00:00Z');
  assert.equal(deviceHealth(device, 24, now).stale, true); assert.equal(deviceHealth(device, 168, now).stale, false);
  assert.equal(deviceHealth({ ...device, timestamp: undefined }, 24, now).unknown, true);
  assert.equal(deviceHealth({ ...device, timestamp: '2030-01-01T00:00:00Z' }, 24, now).unknown, true);
  const summary = healthSummary([device, { ...device, id: 'archived', deleted: true }, { ...device, id: 'unknown', timestamp: undefined, readings: [] }], 24, now);
  assert.equal(summary.all, 2); assert.equal(summary.stale, 1); assert.equal(summary.unknown, 1); assert.equal(summary.noOutputs, 1);
});
test('device sorting is stable for missing timestamps and does not mutate source lists', () => {
  const devices = [{ ...device, id: 'old', name: 'Sensor 10', timestamp: '2026-10-29T00:00:00Z' }, { ...device, id: 'unknown', name: 'Sensor 3', timestamp: undefined }, { ...device, id: 'new', name: 'Sensor 2' }];
  assert.deepEqual(sortDevices(devices, 'name').map(item => item.id), ['new', 'unknown', 'old']);
  assert.deepEqual(sortDevices(devices, 'newest').map(item => item.id), ['new', 'old', 'unknown']);
  assert.deepEqual(sortDevices(devices, 'oldest').map(item => item.id), ['old', 'new', 'unknown']);
  assert.deepEqual(devices.map(item => item.id), ['old', 'unknown', 'new']);
});
test('trends use only numeric values for this device and preserve zero and negative samples', () => {
  const packets = [
    normalizePacket({ _id: 'later', deviceId: device.id, timestamp: '2026-10-30T02:00:00Z', outputs: { temperature: '0', switch: false, mixed: '23 C', empty: '' } }, device.id)!,
    normalizePacket({ _id: 'earlier', deviceId: device.id, timestamp: '2026-10-30T01:00:00Z', outputs: { temperature: { value: -2 } } }, device.id)!,
    normalizePacket({ _id: 'foreign', deviceId: 'other', timestamp: '2026-10-30T00:00:00Z', outputs: { temperature: 100 } }, device.id)!,
  ];
  const result = packetTrends(packets, device);
  assert.equal(result.length, 1); assert.equal(result[0].name, 'Temperature'); assert.deepEqual(result[0].points.map(point => point.value), [-2, 0]);
  assert.equal(result[0].min, -2); assert.equal(result[0].max, 0); assert.equal(result[0].average, -1);
});
const registration = { firstName: ' First ', lastName: ' Last ', emailId: ' person@example.com ', password: 'a good password', confirmation: 'a good password' };
test('registration validates names, email and confirmation without altering passwords', () => {
  assert.deepEqual(registrationInput(registration), { firstName: 'First', lastName: 'Last', emailId: 'person@example.com', password: 'a good password', application: 'Ginjer' });
  for (const patch of [{ firstName: ' ' }, { lastName: '' }, { emailId: 'invalid' }, { password: 'short' }, { confirmation: 'different' }]) assert.throws(() => registrationInput({ ...registration, ...patch }));
});
test('profile updates only include names and the signed-in identity', () => {
  assert.deepEqual(profileInput('user', ' First ', ' Last '), { _id: 'user', firstName: 'First', lastName: 'Last' });
  assert.throws(() => profileInput('', 'First', 'Last')); assert.throws(() => profileInput('user', '', 'Last'));
});
test('registration and profile mutations use separate transports and reject mismatched identity', async () => {
  let publicCalls = 0, authCalls = 0, returnedId = 'user';
  const publicRequest = (async (query, variables) => { publicCalls++; assert.match(query, /mutation Register/); assert.deepEqual(variables, { user: registrationInput(registration) }); return { signUp: { _id: 'user', emailId: 'person@example.com' } }; }) as ApiRequest;
  const authRequest = (async (query, variables) => { authCalls++; assert.match(query, /updateUserProfile/); assert.deepEqual(variables, { editUserInput: { _id: 'user', firstName: 'First', lastName: 'Last' } }); return { updateUserProfile: { _id: returnedId, firstName: 'First', lastName: 'Last', emailId: 'person@example.com', token: 'must-not-store' } }; }) as ApiRequest;
  const api = createAccountApi(publicRequest, authRequest);
  assert.deepEqual(await api.register(registration), { email: 'person@example.com' });
  const updated = await api.update('user', 'First', 'Last'); assert.equal(updated._id, 'user'); assert.equal('token' in updated, false);
  returnedId = 'other'; await assert.rejects(api.update('user', 'First', 'Last'));
  assert.equal(publicCalls, 1); assert.equal(authCalls, 2);
});
