import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDevices } from '../src/features/workspace/services/normalizers.ts';
import { ApiError, createGraphqlTransport } from '../src/services/graphqlTransport.ts';
import {
  createDeviceInspectionApi, deviceScope, formatPacketValue, historyInput,
  normalizeDeviceLogs, normalizeInspection, normalizePacket, normalizePacketHistory, packetValues,
} from '../src/features/workspace/services/deviceInspection.ts';

const [device] = normalizeDevices([{ _id: 'project', name: 'Site', organisationId: 'org', clusters: [{ _id: 'cluster', name: 'Floor', devices: [{
  _id: 'device', organisationId: 'org', projectId: 'project', clusterId: 'cluster', hardwareId: 'hardware', networkId: 'network', devEui: 'EUI',
  mainOutputId: 'switch', networkInterface: 'HTTP', outputs: [
    { outputId: 'battery', outputName: 'Battery', value: '3.7' },
    { outputId: 'switch', outputName: 'Switch', value: '0' },
  ],
}] }] }]);
const scope = deviceScope(device)!;
const packet = { _id: 'packet', deviceId: 'device', clusterId: 'cluster', timestamp: '2026-10-30T00:00:00Z', devEui: 'EUI',
  rssi: '-100', snr: '0', freq: '868.1', channel: '0', port: '1', payload: 'ABC=', outputs: { battery: 0, switch: false, unknown: { value: 2 } } };
const history = { organisationId: 'org', projectId: 'project', metadata: { currentPage: 1, totalPages: 4, totalRecords: 91, noOfRecordsPerPage: 25 }, packets: [packet] };
const logs = { organisationId: 'org', projectId: 'project', clusterId: 'cluster', recordId: 'device', logDetails: [
  { timestamp: '2026-10-29T00:00:00Z', type: 'INFO', message: 'Older entry' },
  { timestamp: '2026-10-30T00:00:00Z', type: 'ERROR', message: 'Latest entry' },
] };

test('live device scope is complete and the configured main output is respected', () => {
  assert.deepEqual(scope, { organisationId: 'org', projectId: 'project', clusterId: 'cluster', deviceId: 'device' });
  assert.equal(device.mainOutput, 'Switch');
  assert.equal(device.mainOutputId, 'switch');
  assert.equal(device.networkInterface, 'HTTP');
  assert.equal(deviceScope({ ...device, source: 'demo' }), undefined);
  assert.equal(deviceScope({ ...device, organizationId: '' }), undefined);
});

test('history uses bounded one-based pagination and omits dates for all time', () => {
  assert.deepEqual(historyInput(scope, 'all', 2), {
    organisationId: 'org', projectId: 'project', deviceId: 'device',
    mergeValue: false, pageInfo: { noOfRecordsPerPage: 25, pageNo: 2 },
  });
  for (const page of [0, -1, 1.5]) assert.throws(() => historyInput(scope, 'all', page));
  assert.throws(() => historyInput({ ...scope, deviceId: '' }, 'all', 1));
});

test('history date filters use explicit ISO UTC boundaries', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  const input = historyInput(scope, '7d', 1, now);
  assert.equal(input.fromDate, '2026-10-23T12:00:00.000Z');
  assert.equal(input.toDate, '2026-10-30T12:00:00.000Z');
  assert.equal(historyInput(scope, '24h', 1, now).fromDate, '2026-10-29T12:00:00.000Z');
  assert.equal(historyInput(scope, '30d', 1, now).fromDate, '2026-09-30T12:00:00.000Z');
});

test('packet history preserves pagination, false and zero outputs, and opaque payloads', () => {
  const result = normalizePacketHistory(history, scope, 1);
  assert.equal(result.totalRecords, 91); assert.equal(result.totalPages, 4);
  assert.equal(result.packets[0].outputs.battery, 0);
  assert.equal(result.packets[0].outputs.switch, false);
  assert.equal(result.packets[0].payload, 'ABC=');
  assert.equal(normalizePacket({ ...packet, payload: '123456789012345678901234567890' }, device.id)?.payload, '123456789012345678901234567890');
  assert.deepEqual(normalizePacket({ ...packet, outputs: JSON.stringify({ battery: 0 }) }, device.id)?.outputs, { battery: 0 });
  assert.equal(result.packets[0].rssi, '-100');
  assert.equal(result.packets[0].snr, '0');
  assert.equal(result.packets[0].timestamp, '2026-10-30T00:00:00.000Z');
});

test('history rejects cross-device/workspace records and permits an earlier cluster for the same device', () => {
  assert.throws(() => normalizePacketHistory({ ...history, organisationId: 'other' }, scope, 1), /workspace/);
  assert.throws(() => normalizePacketHistory({ ...history, projectId: 'other' }, scope, 1), /workspace/);
  assert.throws(() => normalizePacketHistory({ ...history, packets: [{ ...packet, deviceId: 'other' }] }, scope, 1), /device/);
  assert.equal(normalizePacketHistory({ ...history, packets: [{ ...packet, clusterId: 'earlier-cluster' }] }, scope, 1).packets[0].clusterId, 'earlier-cluster');
});

test('packet labels resolve known output IDs and preserve unknown outputs and structured values', () => {
  const normalized = normalizePacket(packet, device.id)!;
  const values = packetValues(normalized, device);
  assert.deepEqual(values.slice(0, 2), [
    { id: 'battery', name: 'Battery', value: '0' },
    { id: 'switch', name: 'Switch', value: 'false' },
  ]);
  assert.equal(values[2].name, 'unknown');
  assert.deepEqual(JSON.parse(values[2].value), { value: 2 });
  assert.equal(formatPacketValue(null), 'Not reported');
  assert.equal(formatPacketValue(''), '');
});

test('nullable logs are empty, successful logs sort by time, and foreign logs are rejected', () => {
  assert.deepEqual(normalizeDeviceLogs(null, scope), []);
  assert.equal(normalizeDeviceLogs(logs, scope)[0].message, 'Latest entry');
  assert.throws(() => normalizeDeviceLogs({ ...logs, recordId: 'other' }, scope), /different device/);
  assert.throws(() => normalizeDeviceLogs({ ...logs, organisationId: 'other' }, scope), /different device/);
});

test('registry metadata resolves names, manufacturers, tags, and zero-valued radio data', () => {
  const snapshots = [{ _id: 'project', organisationId: 'org', clusters: [{ _id: 'cluster', devices: [{ _id: 'device', mainOutputId: 'switch', networkInterface: 'HTTP', networkServerOutputs: packet }] }] }];
  const info = normalizeInspection(device, snapshots,
    [{ _id: 'hardware', organisationId: null, name: 'Watch', modelNo: 'H1', manufacturerId: 'maker', tagId: 'tag', type: 'LORAWAN', gpsSupported: false, image: { location: 'https://images.example.test/watch.png' } }],
    [{ _id: 'network', organisationId: 'org', name: 'Development', networkProvider: 'SENRA', key: 'must-not-be-exposed' }],
    [{ _id: 'maker', organisationId: null, moduleType: 'MANUFACTURER', label: 'Manufacturer' }, { _id: 'tag', organisationId: 'org', moduleType: 'TAGS', label: 'Other' }]);
  assert.equal(info.hardwareName, 'Watch'); assert.equal(info.manufacturer, 'Manufacturer'); assert.equal(info.tag, 'Other');
  assert.equal(info.networkName, 'Development'); assert.equal(info.model, 'H1'); assert.equal(info.gpsSupported, false);
  assert.equal(info.mainOutputId, 'switch'); assert.equal(info.latestPacket?.snr, '0');
  assert.equal(info.imageUri, 'https://images.example.test/watch.png');
  assert.equal(JSON.stringify(info).includes('must-not-be-exposed'), false);
});

test('foreign registry entries and non-HTTPS hardware images are not used', () => {
  const info = normalizeInspection(device, [],
    [{ _id: 'hardware', organisationId: 'other', name: 'Foreign hardware' }],
    [{ _id: 'network', organisationId: 'other', name: 'Foreign network' }], []);
  assert.equal(info.hardwareName, undefined); assert.equal(info.networkName, undefined);
  const image = normalizeInspection(device, [], [{ _id: 'hardware', image: { location: 'javascript:alert(1)' } }], [], []);
  assert.equal(image.imageUri, undefined);
});

test('one failed catalog does not discard other detail data', async () => {
  const api = createDeviceInspectionApi((async (query: string) => {
    if (query.includes('hardwareList')) throw new Error('Hardware unavailable');
    if (query.includes('networkList')) return { networkList: [{ _id: 'network', organisationId: 'org', name: 'Network' }] };
    if (query.includes('modules')) return { modules: [] };
    return { projects: [] };
  }) as Parameters<typeof createDeviceInspectionApi>[0]);
  const info = await api.details(device);
  assert.equal(info.networkName, 'Network');
  assert.equal(info.warnings.length, 1);
  assert.match(info.warnings[0], /Hardware unavailable/);
});

test('history and log adapters send the verified operation names, scope, and cancellation signal', async () => {
  const controller = new AbortController();
  const requests: { query: string; variables: Record<string, unknown>; signal?: AbortSignal }[] = [];
  const api = createDeviceInspectionApi((async (query: string, variables: Record<string, unknown>, signal?: AbortSignal) => {
    requests.push({ query, variables, signal });
    return query.includes('deviceHistoricalData') ? { deviceHistoricalData: history } : { deviceLogs: logs };
  }) as Parameters<typeof createDeviceInspectionApi>[0]);
  await api.history(scope, 'all', 1, controller.signal); await api.logs(scope, controller.signal);
  assert.match(requests[0].query, /deviceHistoricalData\(deviceHistoricalParams:\$input\)/);
  assert.deepEqual(requests[0].variables, { input: historyInput(scope, 'all', 1) });
  assert.match(requests[1].query, /deviceLogs\(deviceParamsInput:\$input\)/);
  assert.deepEqual(requests[1].variables, { input: scope });
  assert.equal(requests[0].signal, controller.signal); assert.equal(requests[1].signal, controller.signal);
});

test('history uses authenticated transport and preserves permission errors rather than reporting empty data', async () => {
  let authorization: string | undefined;
  let rotated: string | undefined;
  const request = createGraphqlTransport({
    getToken: async () => 'session', saveToken: async value => { rotated = value; }, onExpired: async () => {},
    url: 'https://api.example.test/graphql',
    fetcher: (async (_url, init) => {
      authorization = (init?.headers as Record<string, string>).authorization;
      return new Response(JSON.stringify({ data: { deviceHistoricalData: history, token: 'rotated' } }), { status: 200 });
    }) as typeof fetch,
  });
  await createDeviceInspectionApi(request).history(scope, 'all', 1);
  assert.equal(authorization, 'session'); assert.equal(rotated, 'rotated');
  const forbidden = createGraphqlTransport({ url: 'https://api.example.test/graphql', getToken: async () => 'session', saveToken: async () => {}, onExpired: async () => {},
    fetcher: (async () => new Response('{}', { status: 403 })) as typeof fetch });
  await assert.rejects(createDeviceInspectionApi(forbidden).logs(scope), error => error instanceof ApiError && error.code === 'permission');
});
