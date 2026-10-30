import type { Device } from '../../devices/types';
import type { ApiRequest } from '../../../services/graphqlTransport';

export type DeviceScope = { organisationId: string; projectId: string; clusterId: string; deviceId: string };
export type HistoryRange = '24h' | '7d' | '30d' | 'all';
export type DeviceLog = { timestamp?: string; type: string; message: string };
export type DevicePacket = {
  id: string; timestamp?: string; deviceId: string; clusterId: string; devEui: string;
  channel: string; frequency: string; rssi: string; snr: string; port: string;
  payload: unknown; outputs: Record<string, unknown>; decoded: unknown;
};
export type PacketHistory = { packets: DevicePacket[]; currentPage: number; totalPages: number; totalRecords: number };
export type OutputDefinition = { id: string; name: string; category?: string };
export type DeviceInspection = {
  outputDefinitions?: OutputDefinition[];
  hardwareName?: string; hardwareDescription?: string; model?: string; manufacturer?: string; manufacturerId?: string;
  tag?: string; tagId?: string; connectivity?: string; gpsSupported?: boolean; imageUri?: string;
  networkName?: string; networkProvider?: string; networkInterface?: string; mainOutputId?: string;
  latestPacket?: DevicePacket; latestLog?: DeviceLog; warnings: string[];
};
export interface DeviceInspectionApi {
  details(device: Device, signal?: AbortSignal): Promise<DeviceInspection>;
  history(scope: DeviceScope, range: HistoryRange, page: number, signal?: AbortSignal): Promise<PacketHistory>;
  logs(scope: DeviceScope, signal?: AbortSignal): Promise<DeviceLog[]>;
}

const MODULES = 'query DeviceCatalogModules($params:ParamInput!){modules(params:$params){_id organisationId label moduleType}}';
const HARDWARE = 'query DeviceHardware($params:ParamInput!){hardwareList(params:$params){_id organisationId name description modelNo manufacturerId tagId type gpsSupported image{location} loRaWANConfiguration{outputs{moduleId outputModuleType}}}}';
const NETWORKS = 'query DeviceNetworks($params:ParamInput!){networkList(params:$params){_id organisationId name type networkProvider}}';
const PACKET_FIELDS = '_id timestamp channel freq rssi snr port devEui payload';
const SNAPSHOT = 'query DeviceInspection($params:ParamInput!){projects(params:$params){_id organisationId clusters{_id devices{_id mainOutputId networkInterface log{timestamp type message} networkServerOutputs{' + PACKET_FIELDS + '} jsonValue{' + PACKET_FIELDS + '}}}}}';
export const DEVICE_HISTORY_QUERY = 'query DeviceHistory($input:DeviceHistoricalInput!){deviceHistoricalData(deviceHistoricalParams:$input){organisationId projectId metadata{currentPage totalPages totalRecords noOfRecordsPerPage} packets{' + PACKET_FIELDS + ' deviceId clusterId outputs jsonValue}}}';
export const DEVICE_LOGS_QUERY = 'query DeviceActivityLogs($input:DeviceParamsInput!){deviceLogs(deviceParamsInput:$input){organisationId projectId clusterId recordId logDetails{timestamp type message}}}';

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const string = (value: unknown) => value === undefined || value === null ? '' : String(value);
function date(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value)) ? Number(value) : NaN;
  const parsed = new Date(Number.isFinite(numeric) ? (numeric < 100000000000 ? numeric * 1000 : numeric) : String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
}
function json(value: unknown): unknown {
  if (typeof value !== 'string' || !/^[\[{]/.test(value.trim())) return value;
  try { return JSON.parse(value); } catch { return value; }
}
export function deviceScope(device: Device): DeviceScope | undefined {
  const { organizationId, projectId, clusterId, id } = device;
  if (device.source !== 'live' || !organizationId || !projectId || !clusterId || !id) return undefined;
  return { organisationId: organizationId, projectId, clusterId, deviceId: id };
}
export function historyInput(scope: DeviceScope, range: HistoryRange, page: number, now = Date.now()) {
  if (Object.values(scope).some(value => !value.trim())) throw new Error('Device scope is incomplete.');
  if (!Number.isInteger(page) || page < 1) throw new Error('Invalid history page.');
  const days = { '24h': 1, '7d': 7, '30d': 30, all: 0 }[range];
  if (days === undefined) throw new Error('Invalid history range.');
  return { organisationId: scope.organisationId, projectId: scope.projectId, deviceId: scope.deviceId, mergeValue: false, pageInfo: { noOfRecordsPerPage: 25, pageNo: page },
    ...(days ? { fromDate: new Date(now - days * 86400000).toISOString(), toDate: new Date(now).toISOString() } : {}) };
}
export function normalizePacket(value: unknown, deviceId: string): DevicePacket | undefined {
  const packet = object(value);
  if (!packet._id) return undefined;
  return {
    id: string(packet._id), deviceId: string(packet.deviceId || deviceId), clusterId: string(packet.clusterId), timestamp: date(packet.timestamp), devEui: string(packet.devEui),
    channel: string(packet.channel), frequency: string(packet.freq), rssi: string(packet.rssi), snr: string(packet.snr), port: string(packet.port),
    payload: json(packet.payload), outputs: object(json(packet.outputs)), decoded: json(packet.jsonValue),
  };
}
export function normalizePacketHistory(value: unknown, scope: DeviceScope, requestedPage: number): PacketHistory {
  const data = object(value), metadata = object(data.metadata);
  if (!value || data.organisationId !== scope.organisationId || data.projectId !== scope.projectId) throw new Error('The service returned history for a different workspace.');
  const packets = array(data.packets);
  if (packets.some(value => object(value).deviceId !== scope.deviceId)) throw new Error('The service returned history for a different device.');
  const number = (value: unknown, fallback: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
  return {
    packets: packets.map(value => normalizePacket(value, scope.deviceId)).filter((packet): packet is DevicePacket => !!packet),
    currentPage: number(metadata.currentPage, requestedPage), totalPages: number(metadata.totalPages, requestedPage),
    totalRecords: number(metadata.totalRecords, packets.length),
  };
}
export function normalizeDeviceLogs(value: unknown, scope: DeviceScope): DeviceLog[] {
  if (value === null || value === undefined) return [];
  const data = object(value);
  if (data.recordId !== scope.deviceId || data.organisationId !== scope.organisationId || data.projectId !== scope.projectId || data.clusterId !== scope.clusterId) throw new Error('The service returned logs for a different device.');
  return array(data.logDetails).map(value => {
    const log = object(value);
    return { timestamp: date(log.timestamp), type: string(log.type), message: string(log.message) };
  }).sort((left, right) => (right.timestamp || '').localeCompare(left.timestamp || ''));
}
export function packetValues(packet: DevicePacket, device: Device): { id: string; name: string; value: string }[] {
  return Object.entries(packet.outputs).map(([id, value]) => ({ id, name: device.readings.find(reading => reading.id === id)?.title || id, value: formatPacketValue(value) }));
}
export function formatPacketValue(value: unknown): string {
  if (value === undefined || value === null) return 'Not reported';
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}
export function normalizeInspection(device: Device, snapshots: unknown, hardwareItems: unknown, networkItems: unknown, modules: unknown): DeviceInspection {
  const belongs = (value: unknown) => { const item = object(value); return item.organisationId == null || item.organisationId === device.organizationId; };
  const hardware = object(array(hardwareItems).find(value => object(value)._id === device.hardwareId && belongs(value)));
  const network = object(array(networkItems).find(value => object(value)._id === device.networkId && belongs(value)));
  const findLabel = (id: unknown, type: string) => string(object(array(modules).find(value => object(value)._id === id && object(value).moduleType === type && belongs(value))).label) || undefined;
  const project = object(array(snapshots).find(value => object(value)._id === device.projectId && object(value).organisationId === device.organizationId));
  const cluster = object(array(project.clusters).find(value => object(value)._id === device.clusterId));
  const snapshot = object(array(cluster.devices).find(value => object(value)._id === device.id));
  const latest = snapshot.networkServerOutputs ?? snapshot.jsonValue;
  const log = object(snapshot.log);
  const image = string(object(hardware.image).location);
  return {
    outputDefinitions: array(object(hardware.loRaWANConfiguration).outputs).map(object).filter(output => !!output.moduleId).map(output => ({
      id: string(output.moduleId), name: findLabel(output.moduleId, 'OUTPUT') || string(output.moduleId), category: string(output.outputModuleType) || undefined,
    })),
    hardwareName: string(hardware.name) || undefined, hardwareDescription: string(hardware.description) || undefined,
    model: string(hardware.modelNo) || undefined, manufacturer: findLabel(hardware.manufacturerId, 'MANUFACTURER'), manufacturerId: string(hardware.manufacturerId) || undefined,
    tag: findLabel(hardware.tagId, 'TAGS'), tagId: string(hardware.tagId) || undefined,
    connectivity: string(hardware.type || device.hardwareType) || undefined, gpsSupported: typeof hardware.gpsSupported === 'boolean' ? hardware.gpsSupported : undefined,
    imageUri: /^https:\/\//i.test(image) ? image : undefined, networkName: string(network.name) || undefined, networkProvider: string(network.networkProvider) || undefined,
    mainOutputId: string(snapshot.mainOutputId || device.mainOutputId) || undefined, networkInterface: string(snapshot.networkInterface || device.networkInterface) || undefined,
    latestPacket: normalizePacket(latest, device.id),
    latestLog: Object.keys(log).length ? { timestamp: date(log.timestamp), type: string(log.type), message: string(log.message) } : undefined,
    warnings: [],
  };
}
export function createDeviceInspectionApi(request: ApiRequest): DeviceInspectionApi {
  return {
    async details(device, signal) {
      const scope = deviceScope(device);
      if (!scope) throw new Error('This device is missing its workspace identifiers.');
      const results = await Promise.allSettled([
        request<{ projects: unknown }>(SNAPSHOT, { params: { organisationId: scope.organisationId, projectId: scope.projectId } }, signal),
        request<{ hardwareList: unknown }>(HARDWARE, { params: { organisationId: scope.organisationId } }, signal),
        request<{ networkList: unknown }>(NETWORKS, { params: { organisationId: scope.organisationId } }, signal),
        request<{ modules: unknown }>(MODULES, { params: { organisationId: scope.organisationId } }, signal),
      ]);
      const [snapshot, hardware, network, modules] = results;
      const details = normalizeInspection(device, snapshot.status === 'fulfilled' ? snapshot.value.projects : [],
        hardware.status === 'fulfilled' ? hardware.value.hardwareList : [], network.status === 'fulfilled' ? network.value.networkList : [], modules.status === 'fulfilled' ? modules.value.modules : []);
      const labels = ['Latest packet', 'Hardware information', 'Network information', 'Manufacturer and tag labels'];
      details.warnings = results.flatMap((result, index) => result.status === 'rejected' ? [labels[index] + ': ' + (result.reason instanceof Error ? result.reason.message : 'Unable to load.')] : []);
      return details;
    },
    async history(scope, range, page, signal) {
      const data = await request<{ deviceHistoricalData: unknown }>(DEVICE_HISTORY_QUERY, { input: historyInput(scope, range, page) }, signal);
      return normalizePacketHistory(data.deviceHistoricalData, scope, page);
    },
    async logs(scope, signal) {
      if (Object.values(scope).some(value => !value.trim())) throw new Error('Device scope is incomplete.');
      const data = await request<{ deviceLogs: unknown }>(DEVICE_LOGS_QUERY, { input: scope }, signal);
      return normalizeDeviceLogs(data.deviceLogs, scope);
    },
  };
}
