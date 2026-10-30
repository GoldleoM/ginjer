import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAutomationApi, configuredScheduleCount, normalizeRunHistory, normalizeAttempts, readableValue, RUN_AUTOMATION, TOGGLE_AUTOMATION } from '../src/features/workspace/services/automation.ts';
import { normalizeRules, createOperationsApi } from '../src/features/workspace/services/operations.ts';
import type { ApiRequest } from '../src/services/graphqlTransport.ts';
const scope = { organisationId: 'org', projectId: 'project' };
const raw = { _id: 'rule', ...scope, name: 'Pump On', active: true, triggerTypes: ['MANUAL'], advanceConditions: [{ deviceId: 'device', downlinkInterfaceId: 'controller' }] };
const [rule] = normalizeRules([raw], scope);
const run = { _id: 'run', ...scope, alertId: 'rule', state: 'SUCCEEDED', active: false, triggeredAt: '2026-10-30T00:00:00Z', currentStep: 0,
  steps: [{ deviceId: 'device', downlinkInterfaceId: 'controller', value: false, phase: 'SUCCEEDED', attempt: 1, delayMin: 0, downlinkIds: ['attempt'], feedback: { deviceId: 'device', outputId: 'output', value: '0', timeoutInMin: 0 } }] };
const root = { organisationId: 'org', alertId: 'rule', metadata: { currentPage: 1, totalPages: 1, totalRecords: 1 }, runs: [run] };

test('automation history preserves zero and false values and excludes foreign projects', () => {
  const result = normalizeRunHistory({ ...root, runs: [run, { ...run, _id: 'other', projectId: 'other' }] }, scope, 'rule', 1);
  assert.equal(result.runs.length, 1); assert.equal(result.runs[0].currentStep, 0);
  assert.equal(result.runs[0].steps[0].value, false); assert.equal(result.runs[0].steps[0].feedback?.value, '0');
  assert.equal(result.runs[0].steps[0].delay, 0);
  assert.throws(() => normalizeRunHistory({ ...root, organisationId: 'other' }, scope, 'rule', 1), /match/);
});
test('attempt history validates parent and item scope and preserves zero-based step indexes', () => {
  const attempt = { _id: 'attempt', organisationId: 'org', alertId: 'rule', runId: 'run', stepIndex: 0, attempt: 1, feedbackValue: '0', status: 'SUCCESS' };
  const result = normalizeAttempts({ ...root, downlinks: [attempt, { ...attempt, _id: 'foreign', organisationId: 'other' }] }, scope, 'rule', 1);
  assert.equal(result.attempts.length, 1); assert.equal(result.attempts[0].stepIndex, 0); assert.equal(result.attempts[0].feedback, '0');
  assert.throws(() => normalizeAttempts({ ...root, alertId: 'foreign' }, scope, 'rule', 1), /match/);
});
test('command values render readable text while preserving false and zero', () => {
  assert.equal(readableValue(false), 'false'); assert.equal(readableValue(0), '0');
  assert.equal(readableValue({ relay: false, duration: 0 }), 'relay: false, duration: 0');
});
test('toggle validates current rule and does not flip an already matching state', async () => {
  const calls: string[] = []; const api = createAutomationApi((async q => { calls.push(q); return { alerts: [raw] }; }) as ApiRequest);
  assert.equal(await api.toggle(scope, rule, true), true); assert.equal(calls.length, 1);
  await assert.rejects(api.toggle({ ...scope, projectId: 'foreign' }, rule, false), /different project/);
  assert.equal(calls.length, 1);
});
test('toggle writes once, scoped to selected rule, and verifies the returned state', async () => {
  const calls: { q: string; variables: unknown }[] = []; let confirmed = false;
  const api = createAutomationApi((async (q, variables) => { calls.push({ q, variables }); return q === TOGGLE_AUTOMATION ? { toggleAlert: { ...raw, active: confirmed } } : { alerts: [raw] }; }) as ApiRequest);
  assert.equal(await api.toggle(scope, rule, false), false);
  assert.deepEqual(calls[1].variables, { params: { ...scope, alertId: 'rule' } });
  confirmed = true; await assert.rejects(api.toggle(scope, rule, false), /did not confirm/);
  assert.equal(calls.filter(c => c.q === TOGGLE_AUTOMATION).length, 2);
});
test('deleted or foreign rules cannot be executed or toggled', async () => {
  let count = 0; const api = createAutomationApi((async () => { count++; return { alerts: [{ ...raw, deleted: true }] }; }) as ApiRequest);
  await assert.rejects(api.run(scope, rule), /no longer available/); assert.equal(count, 1);
});
test('manual run checks trigger capability and live run state before mutation', async () => {
  let current = { ...raw, triggerTypes: ['TIME_BASED_SCHEDULE'] }; let running = false; const calls: string[] = [];
  const api = createAutomationApi((async q => { calls.push(q); return q.includes('VerifyAutomation') ? { alerts: [current] } : { automationRuns: { ...root, runs: running ? [{ ...run, state: 'RUNNING' }] : [] } }; }) as ApiRequest);
  await assert.rejects(api.run(scope, rule), /does not support/); assert.equal(calls.length, 1);
  current = raw; running = true; await assert.rejects(api.run(scope, rule), /already running/);
  assert.equal(calls.includes(RUN_AUTOMATION), false);
});
test('manual runs require explicit server acceptance, with no retries', async () => {
  let accepted: unknown = true; let sends = 0;
  const api = createAutomationApi((async (q, variables) => {
    if (q === RUN_AUTOMATION) { sends++; assert.deepEqual(variables, { alertId: 'rule' }); return { manualAutomation: accepted }; }
    return q.includes('VerifyAutomation') ? { alerts: [raw] } : { automationRuns: { ...root, runs: [] } };
  }) as ApiRequest);
  await api.run(scope, rule); assert.equal(sends, 1);
  accepted = false; await assert.rejects(api.run(scope, rule), /did not accept/); assert.equal(sends, 2);
  accepted = 'true'; await assert.rejects(api.run(scope, rule), /did not accept/); assert.equal(sends, 3);
});
test('history forwards cancellation and validates pagination', async () => {
  const signal = new AbortController().signal; let count = 0;
  const api = createAutomationApi((async (_q, variables, passed) => { count++; assert.equal(passed, signal); assert.deepEqual(variables, { params: { alertId: 'rule', pageInfo: { pageNo: 1, noOfRecordsPerPage: 20 } } }); return { automationRuns: root }; }) as ApiRequest);
  await api.history(scope, 'rule', 1, signal); await assert.rejects(api.history(scope, 'rule', 0), /Invalid/); assert.equal(count, 1);
});
test('catalog and schedules exclude other organizations and deleted entries', async () => {
  const api = createAutomationApi((async () => ({ solutionList: [{ _id: 'shared', name: 'Shared' }, { _id: 'foreign', organisationId: 'other' }], modules: [{ _id: 'm', label: 'Valve' }, { _id: 'secret', organisationId: 'other', label: 'Foreign' }], alertSchedules: [{ _id: 's', ...scope, alertId: 'rule', name: 'Daily' }, { _id: 's2', ...scope, alertId: 'other' }] })) as ApiRequest);
  assert.deepEqual(await api.catalog(scope), { solutions: [{ id: 'shared', name: 'Shared' }], labels: { m: 'Valve' } });
  assert.deepEqual(await api.schedules(scope, 'rule'), [{ id: 's', name: 'Daily' }]);
});

test('missing run data cannot be interpreted as permission to start another run', async () => {
  let sent = false;
  const api = createAutomationApi((async q => { if (q === RUN_AUTOMATION) sent = true; return q.includes('VerifyAutomation') ? { alerts: [raw] } : { automationRuns: { ...root, runs: undefined } }; }) as ApiRequest);
  await assert.rejects(api.run(scope, rule), /valid automation runs/); assert.equal(sent, false);
});

test('website AlertList shape preserves command settings, feedback and linked condition devices', async () => {
  const signal = new AbortController().signal;
  const api = createOperationsApi((async (_query, variables, passed) => {
    assert.deepEqual(variables, { alertParamsInput: scope }); assert.equal(passed, signal);
    return { alerts: [{ ...raw,
      conditions: [{ outputId: 'temp', conditionType: 'GREATER_THAN', value: '28', relationType: 'AND', devices: [{ deviceId: 'sensor' }] }],
      advanceConditions: [{ deviceId: 'device', downlinkInterfaceId: 'controller', value: false, scheduleInMin: 0, port: 1, deviceClass: 'CLASS_C', triggerType: 'MANUAL', active: false,
        feedback: { deviceId: 'feedback-device', outputId: 'relay', conditionType: 'EQUAL_TO', value: '0', timeoutInMin: 0 } }],
    }, { ...raw, projectId: 'foreign' }] };
  }) as ApiRequest);
  const [item] = await api.rules(scope, signal);
  assert.deepEqual(item.deviceIds, ['sensor', 'device', 'feedback-device']);
  assert.equal(item.conditions[0].relation, 'AND');
  assert.equal(item.actions[0].value, false); assert.equal(item.actions[0].delay, 0); assert.equal(item.actions[0].active, false);
  assert.equal(item.actions[0].port, 1); assert.equal(item.actions[0].deviceClass, 'CLASS_C');
  assert.equal(item.actions[0].feedback?.value, '0'); assert.equal(item.actions[0].feedback?.timeout, 0);
});

test('legacy inline schedules provide a count without double counting alertSchedules', () => {
  const [item] = normalizeRules([{ ...raw, triggerTypes: ['TIME_BASED_SCHEDULE'], timeBasedScheduleConfigurations: {
    type: 'CUSTOM', scheduleInMin: 30, triggerTime: '08:00', triggerTimezone: 'Asia/Kolkata', repeatType: 'WEEKLY', repeatOn: ['MONDAY', 'FRIDAY'],
    triggerEndTime: false, endTime: '19:00', endTimeSchedule: { type: 'AFTER_OCCURRENCES', noOfOccurrences: 10 },
  } }], scope);
  assert.equal(item.scheduleConfiguration?.timezone, 'Asia/Kolkata');
  assert.deepEqual(item.scheduleConfiguration?.repeatOn, ['MONDAY', 'FRIDAY']);
  assert.equal(item.scheduleConfiguration?.endTime, ''); assert.equal(item.scheduleConfiguration?.end?.occurrences, 10);
  assert.equal(configuredScheduleCount(item, 0), 1); assert.equal(configuredScheduleCount(item, undefined), 1);
  assert.equal(configuredScheduleCount(item, 3), 3); assert.equal(configuredScheduleCount(rule, 0), 0); assert.equal(configuredScheduleCount(rule), undefined);
});

test('automatic disable reasons retain the first step and do not override active state', () => {
  const [item] = normalizeRules([{ ...raw, active: false, autoDisabled: { at: '2026-10-30T12:00:00Z', runId: 'run', stepIndex: 0, reason: 'DEVICE_DELETED', deviceId: 'device' } }], scope);
  assert.equal(item.autoDisabled?.stepIndex, 0); assert.equal(item.autoDisabled?.reason, 'DEVICE_DELETED');
  assert.equal(item.autoDisabled?.at, '2026-10-30T12:00:00.000Z'); assert.equal(item.active, false);
});

test('missing schedule and command settings remain unknown instead of invented defaults', () => {
  assert.equal(rule.scheduleConfiguration, undefined); assert.equal(rule.autoDisabled, undefined);
  assert.equal(rule.actions[0].port, undefined); assert.equal(rule.actions[0].delay, undefined); assert.equal(rule.actions[0].feedback, undefined);
});

test('rule list retains all trigger types and disabled rules beyond thirty entries', async () => {
  const rows = Array.from({ length: 38 }, (_, index) => ({ ...raw, _id: `rule-${index}`, active: index % 2 === 0,
    triggerTypes: [index % 3 === 0 ? 'MANUAL' : index % 3 === 1 ? 'TIME_BASED_SCHEDULE' : 'NEW_MEASUREMENT'], advanceConditions: [],
  }));
  const api = createOperationsApi((async () => ({ alerts: [...rows, { ...raw, projectId: 'other' }, { ...raw, deleted: true }] })) as ApiRequest);
  const result = await api.rules(scope);
  assert.equal(result.length, 38); assert.equal(result.at(-1)?.id, 'rule-37');
  assert.equal(result.filter(rule => !rule.active).length, 19);
});

test('rule refresh replaces removed and changed rules and rejects missing lists', async () => {
  let alerts: unknown = [raw];
  const api = createOperationsApi((async () => ({ alerts })) as ApiRequest);
  assert.equal((await api.rules(scope))[0].name, 'Pump On');
  alerts = [{ ...raw, name: 'Renamed', active: false }];
  const next = await api.rules(scope); assert.equal(next[0].name, 'Renamed'); assert.equal(next[0].active, false);
  alerts = []; assert.deepEqual(await api.rules(scope), []);
  for (const invalid of [null, undefined, {}]) { alerts = invalid; await assert.rejects(api.rules(scope), /valid automation list/); }
});

test('manual automation sends only its ID and never replays configured downlinks', async () => {
  const commands = [{ deviceId: 'device', downlinkInterfaceId: 'controller', value: { relay: false }, port: 17, deviceClass: 'CLASS_A', scheduleInMin: 3 }];
  const [configured] = normalizeRules([{ ...raw, advanceConditions: commands }], scope);
  const writes: { query: string; variables: unknown }[] = [];
  const api = createAutomationApi((async (query, variables) => {
    if (query.startsWith('mutation')) { writes.push({ query, variables }); return { manualAutomation: true }; }
    return query.includes('VerifyAutomation') ? { alerts: [{ ...raw, advanceConditions: commands }] } : { automationRuns: { ...root, runs: [] } };
  }) as ApiRequest);
  await api.run(scope, configured);
  assert.deepEqual(writes, [{ query: RUN_AUTOMATION, variables: { alertId: 'rule' } }]);
});
