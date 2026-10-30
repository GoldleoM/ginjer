import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDevices } from '../src/features/workspace/services/normalizers.ts';
import { normalizeInspection } from '../src/features/workspace/services/deviceInspection.ts';
import { deviceDataFields, deviceSummaryFields, initialDataTab } from '../src/features/workspace/services/deviceData.ts';

const [device] = normalizeDevices([{ _id: 'p', clusters: [{ _id: 'c', devices: [{ _id: 'd', organisationId: 'o', hardwareId: 'h', mainOutputId: 'battery', outputs: [], attributes: [{ attributeId: 'a', attributeName: 'Interval', value: 0 }] }] }] }]);
test('hardware-defined status cards exist without fabricating a received value', () => {
  const info = normalizeInspection(device, [], [{ _id: 'h', organisationId: 'o', loRaWANConfiguration: { outputs: [{ moduleId: 'battery', outputModuleType: 'STATUS_DATA' }] } }], [], [{ _id: 'battery', label: 'Battery', moduleType: 'OUTPUT' }]);
  const groups = deviceDataFields(device, info.outputDefinitions);
  assert.equal(groups.status[0].name, 'Battery'); assert.equal(groups.status[0].value, 'Not reported'); assert.equal(groups.status[0].main, true);
  assert.equal(groups.attributes[0].name, 'Interval'); assert.equal(groups.attributes[0].value, '0');
  assert.equal(initialDataTab(groups), 'status');
});
test('an attribute-only device opens its populated tab rather than an empty status tab', () => {
  const groups = deviceDataFields(device);
  assert.equal(groups.status.length, 0); assert.equal(groups.attributes.length, 1); assert.equal(initialDataTab(groups), 'attributes');
});
test('readings override definitions, retain zero/false and respect output categories', () => {
  const readings = [
    { id: 'battery', title: 'Battery', value: '0', label: '', icon: 'battery-outline' as const, tone: 'neutral' as const, summary: '0' },
    { id: 'config', title: 'Enabled', value: 'false', label: '', icon: 'tune-variant' as const, tone: 'neutral' as const, summary: 'false', category: 'CONFIGURATION_DATA' },
    { id: 'hidden', title: 'Hidden', value: '10', label: '', icon: 'tune-variant' as const, tone: 'neutral' as const, summary: '10', category: 'HIDDEN' },
  ];
  const groups = deviceDataFields({ ...device, readings }, [{ id: 'battery', name: 'Battery' }]);
  assert.equal(groups.status.length, 1); assert.equal(groups.status[0].value, '0'); assert.equal(groups.configuration[0].value, 'false');
  assert.ok(!Object.values(groups).flat().some(field => field.id === 'hidden'));
});
test('device list prioritizes the configured main output and includes attributes in compact mode', () => {
  const reading = { title: 'Reading', value: 'false', label: '', icon: 'chart-line' as const, tone: 'neutral' as const, summary: 'false' };
  const data = { ...device, readings: [{ ...reading, id: 'other' }, { ...reading, id: 'battery' }] };
  const compact = deviceSummaryFields(data, true);
  assert.equal(compact[0].id, 'output:battery'); assert.equal(compact[0].main, true); assert.equal(compact[0].value, 'false');
  assert.equal(compact[1].id, 'attribute:a'); assert.equal(compact[1].value, '0'); assert.equal(compact[1].main, false);
  assert.equal(deviceSummaryFields(data).length, 3);
  assert.equal(deviceSummaryFields(device, true)[0].name, 'Interval');
});
