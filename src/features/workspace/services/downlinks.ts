import type { ApiRequest } from '../../../services/graphqlTransport';
import type { Device } from '../../devices/types';

export interface DownlinkInterface { id: string; name: string; }
export interface SavedCommand { id: string; name: string; interfaceId: string; value: Record<string, unknown>; port: number; deviceClass: 'CLASS_A' | 'CLASS_B' | 'CLASS_C'; networkKeyId: string; }
export interface DownlinkOptions { deviceId: string; organisationId: string; hardwareId: string; networkId?: string; interfaces: DownlinkInterface[]; networkKeys?: { id: string; name: string }[]; defaultNetworkKeyId?: string; commands: SavedCommand[]; warnings: string[]; }
export interface DownlinkDraft { interfaceId: string; value: string | Record<string, unknown>; port?: number; deviceClass?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C'; networkKeyId?: string; }
export interface DownlinkResult { type: string; message: string; timestamp?: string; outcome?: 'accepted' | 'unknown'; }
export interface DownlinkApi {
  options(device: Device, signal?: AbortSignal): Promise<DownlinkOptions>;
  send(device: Device, draft: DownlinkDraft, options: DownlinkOptions): Promise<DownlinkResult>;
}
const obj = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const str = (value: unknown) => typeof value === 'string' ? value : '';
export function parseCommandValue(raw: string): Record<string, unknown> {
  if (raw.length > 32768) throw new Error('Command value must be smaller than 32 KB.');
  let value: unknown;
  try { value = JSON.parse(raw, (_key, item) => { if (typeof item === 'number' && !Number.isFinite(item)) throw new Error('Invalid number'); return item; }); }
  catch { throw new Error('Enter a valid JSON object with finite numeric values for this interface.'); }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Command value must be a JSON object.');
  return value as Record<string, unknown>;
}
// The official web form sends this field as a string, not a JSON object.
export function controllerValue(raw: string): string {
  if (!raw.trim()) throw new Error('Enter a controller value.');
  if (raw.length > 32768) throw new Error('Controller value must be smaller than 32 KB.');
  return raw;
}
export function networkDownlinkKeys(device: Device, networks: unknown) {
  const network = arr(networks).map(obj).find(row => row._id === device.networkId && (!row.organisationId || row.organisationId === device.organizationId) && row.deleted !== true);
  const networkKeys = arr(obj(obj(network?.configuration).httpOptions).networkKeys).map(obj)
    .filter(row => !!str(row._id)).map(row => ({ id: str(row._id), name: str(row.name) || 'Downlink key' }));
  return { networkKeys, defaultNetworkKeyId: device.networkKeyId ? networkKeys.find(key => key.id === device.networkKeyId)?.id : networkKeys[0]?.id };
}
export function normalizeDownlinks(device: Device, hardware: unknown, modules: unknown, favorites: unknown): DownlinkOptions {
  const match = arr(hardware).map(obj).find(row => row._id === device.hardwareId && (!row.organisationId || row.organisationId === device.organizationId) && row.deleted !== true);
  // Bind commands to the device's own hardware; an organization-wide module is not proof of compatibility.
  const ids = new Set(arr(obj(match?.loRaWANConfiguration).controllers).map(obj).map(row => str(row.moduleId)).filter(Boolean));
  const interfaces = arr(modules).map(obj).filter(row => ids.has(str(row._id)) && row.moduleType === 'DOWNLINK_INTERFACE' && (!row.organisationId || row.organisationId === device.organizationId))
    .map(row => ({ id: str(row._id), name: str(row.label) || 'Downlink interface' }));
  const commands: SavedCommand[] = [];
  let invalid = 0;
  for (const row of arr(favorites).map(obj)) {
    if (row.deviceId !== device.id || row.organisationId !== device.organizationId || !interfaces.some(item => item.id === row.downlinkInterfaceId)) continue;
    try {
      const value = parseCommandValue(str(row.value));
      const port = Number(row.port), deviceClass = str(row.class);
      if (!Number.isInteger(port) || port < 1 || port > 223 || !['CLASS_A', 'CLASS_B', 'CLASS_C'].includes(deviceClass) || !str(row.networkKeyId)) throw new Error('Invalid saved command');
      commands.push({ id: str(row._id) || 'saved-' + commands.length, name: str(row.name) || 'Saved command', interfaceId: str(row.downlinkInterfaceId), value, port, deviceClass: deviceClass as SavedCommand['deviceClass'], networkKeyId: str(row.networkKeyId) });
    } catch { invalid++; }
  }
  return { deviceId: device.id, organisationId: device.organizationId || '', hardwareId: device.hardwareId, networkId: device.networkId, interfaces, commands, warnings: invalid ? [invalid + ' saved command(s) have an invalid payload or network settings. Update them in the web console.'] : [] };
}
export function downlinkAction(device: Device, draft: DownlinkDraft, options: DownlinkOptions) {
  if (device.source !== 'live' || device.deleted || !device.id || !device.organizationId || !device.projectId) throw new Error('Select a current device before sending a command.');
  if (options.deviceId !== device.id || options.organisationId !== device.organizationId || options.hardwareId !== device.hardwareId) throw new Error('Command options belong to a different device. Reopen the command panel.');
  if (options.networkId !== device.networkId) throw new Error('The device network has changed. Reopen the command panel.');
  if (!options.interfaces.some(item => item.id === draft.interfaceId)) throw new Error('Choose an interface supported by this hardware.');
  const value = typeof draft.value === 'string' ? controllerValue(draft.value) : parseCommandValue(JSON.stringify(draft.value));
  if (options.networkKeys && (!draft.networkKeyId || !options.networkKeys.some(key => key.id === draft.networkKeyId))) throw new Error('Choose a downlink key for this device network.');
  if (draft.port !== undefined && (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 223)) throw new Error('Port must be a whole number from 1 to 223.');
  if (draft.deviceClass !== undefined && !['CLASS_A', 'CLASS_B', 'CLASS_C'].includes(draft.deviceClass)) throw new Error('Choose a valid device class.');
  return { organisationId: device.organizationId, deviceId: device.id, downlinkInterfaceId: draft.interfaceId, value, timeout: 1000,
    ...(draft.port !== undefined ? { port: draft.port } : {}), ...(draft.deviceClass ? { class: draft.deviceClass } : {}), ...(draft.networkKeyId ? { networkKeyId: draft.networkKeyId } : {}) };
}
// GraphQL success does not imply that the network accepted the downlink.
// Match the web console's nested HTTP status handling; never claim delivery.
export function normalizeDownlinkResult(raw: unknown): DownlinkResult {
  const result = obj(raw), type = str(result.type), message = str(result.message);
  if (!type || !message) throw new Error('The server did not confirm the command result. Check device logs before trying again.');
  let payload: Record<string, unknown> = {};
  let structured = false;
  try { payload = obj(JSON.parse(message)); structured = true; } catch { /* Some network responses are plain text. */ }
  const status = typeof payload.status === 'number' || typeof payload.status === 'string' ? Number(payload.status) : undefined;
  const reason = str(payload.statusText) || str(payload.message) || (structured ? 'The server returned no delivery details.' : message);
  if (/parsing|error|fail|reject/i.test(type) || (status !== undefined && ![200, 201, 202].includes(status))) {
    throw new Error('Downlink rejected' + (status !== undefined && Number.isFinite(status) ? ' (' + status + ')' : '') + ': ' + reason);
  }
  return { type, message: reason, timestamp: str(result.timestamp) || undefined,
    outcome: status !== undefined && [200, 201, 202].includes(status) ? 'accepted' : 'unknown' };
}
export const DOWNLINK_HARDWARE_QUERY = 'query DownlinkHardware($params: ParamInput!) { hardwareList(params: $params) { _id organisationId deleted loRaWANConfiguration { controllers { moduleId } } } }';
export const DOWNLINK_MODULES_QUERY = 'query DownlinkModules($params: ParamInput!) { modules(params: $params) { _id label moduleType organisationId } }';
export const SAVED_COMMANDS_QUERY = 'query SavedCommands($params: FavoriteDownlinkParamsInput!) { getFavoriteDownlinks(favoriteDownlinkParamsInput: $params) { _id name deviceId organisationId downlinkInterfaceId port class value networkKeyId } }';
export const DOWNLINK_NETWORKS_QUERY = 'query DownlinkNetworks($params: ParamInput!) { networkList(params: $params) { _id organisationId deleted configuration { httpOptions { networkKeys { _id name } } } } }';
export const SEND_DOWNLINK_QUERY = 'query SendDownlink($action: SendDownlinkInput!) { sendDownlink(action: $action) { timestamp type message } }';
export function createDownlinkApi(request: ApiRequest): DownlinkApi {
  return {
    async options(device, signal) {
      if (!device.organizationId || !device.id || !device.hardwareId || device.source !== 'live') throw new Error('Device identifiers are unavailable.');
      const params = { organisationId: device.organizationId };
      const [hardware, modules, networks] = await Promise.allSettled([
        request<{ hardwareList: unknown }>(DOWNLINK_HARDWARE_QUERY, { params }, signal),
        request<{ modules: unknown }>(DOWNLINK_MODULES_QUERY, { params }, signal),
        request<{ networkList: unknown }>(DOWNLINK_NETWORKS_QUERY, { params }, signal),
      ]);
      if (hardware.status === 'rejected') throw hardware.reason;
      if (modules.status === 'rejected') throw modules.reason;
      if (networks.status === 'rejected') throw networks.reason;
      const options = normalizeDownlinks(device, hardware.value.hardwareList, modules.value.modules, []);
      return { ...options, ...networkDownlinkKeys(device, networks.value.networkList) };
    },
    async send(device, draft, options) {
      const data = await request<{ sendDownlink: unknown }>(SEND_DOWNLINK_QUERY, { action: downlinkAction(device, draft, options) });
      return normalizeDownlinkResult(data.sendDownlink);
    },
  };
}
