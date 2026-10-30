import type { ApiRequest } from '../../../services/graphqlTransport';
import type { Device } from '../../devices/types';

export interface DownlinkInterface { id: string; name: string; }
export interface SavedCommand { id: string; name: string; interfaceId: string; value: Record<string, unknown>; port: number; deviceClass: 'CLASS_A' | 'CLASS_B' | 'CLASS_C'; networkKeyId: string; }
export interface DownlinkOptions { deviceId: string; organisationId: string; hardwareId: string; interfaces: DownlinkInterface[]; commands: SavedCommand[]; warnings: string[]; }
export interface DownlinkDraft { interfaceId: string; value: Record<string, unknown>; port?: number; deviceClass?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C'; networkKeyId?: string; }
export interface DownlinkResult { type: string; message: string; timestamp?: string; }
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
  return { deviceId: device.id, organisationId: device.organizationId || '', hardwareId: device.hardwareId, interfaces, commands, warnings: invalid ? [invalid + ' saved command(s) have an invalid payload or network settings. Update them in the web console.'] : [] };
}
export function downlinkAction(device: Device, draft: DownlinkDraft, options: DownlinkOptions) {
  if (device.source !== 'live' || device.deleted || !device.id || !device.organizationId || !device.projectId) throw new Error('Select a current device before sending a command.');
  if (options.deviceId !== device.id || options.organisationId !== device.organizationId || options.hardwareId !== device.hardwareId) throw new Error('Command options belong to a different device. Reopen the command panel.');
  if (!options.interfaces.some(item => item.id === draft.interfaceId)) throw new Error('Choose an interface supported by this hardware.');
  const value = parseCommandValue(JSON.stringify(draft.value));
  if (draft.port !== undefined && (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 223)) throw new Error('Port must be a whole number from 1 to 223.');
  if (draft.deviceClass !== undefined && !['CLASS_A', 'CLASS_B', 'CLASS_C'].includes(draft.deviceClass)) throw new Error('Choose a valid device class.');
  return { organisationId: device.organizationId, deviceId: device.id, downlinkInterfaceId: draft.interfaceId, value,
    ...(draft.port !== undefined ? { port: draft.port } : {}), ...(draft.deviceClass ? { class: draft.deviceClass } : {}), ...(draft.networkKeyId ? { networkKeyId: draft.networkKeyId } : {}) };
}
export const DOWNLINK_HARDWARE_QUERY = 'query DownlinkHardware($params: ParamInput!) { hardwareList(params: $params) { _id organisationId deleted loRaWANConfiguration { controllers { moduleId } } } }';
export const DOWNLINK_MODULES_QUERY = 'query DownlinkModules($params: ParamInput!) { modules(params: $params) { _id label moduleType organisationId } }';
export const SAVED_COMMANDS_QUERY = 'query SavedCommands($params: FavoriteDownlinkParamsInput!) { getFavoriteDownlinks(favoriteDownlinkParamsInput: $params) { _id name deviceId organisationId downlinkInterfaceId port class value networkKeyId } }';
export const SEND_DOWNLINK_QUERY = 'query SendDownlink($action: SendDownlinkInput!) { sendDownlink(action: $action) { timestamp type message } }';
export function createDownlinkApi(request: ApiRequest): DownlinkApi {
  return {
    async options(device, signal) {
      if (!device.organizationId || !device.id || !device.hardwareId || device.source !== 'live') throw new Error('Device identifiers are unavailable.');
      const params = { organisationId: device.organizationId };
      const [hardware, modules, saved] = await Promise.allSettled([
        request<{ hardwareList: unknown }>(DOWNLINK_HARDWARE_QUERY, { params }, signal),
        request<{ modules: unknown }>(DOWNLINK_MODULES_QUERY, { params }, signal),
        request<{ getFavoriteDownlinks: unknown }>(SAVED_COMMANDS_QUERY, { params: { deviceId: device.id } }, signal),
      ]);
      if (hardware.status === 'rejected') throw hardware.reason;
      if (modules.status === 'rejected') throw modules.reason;
      const options = normalizeDownlinks(device, hardware.value.hardwareList, modules.value.modules, saved.status === 'fulfilled' ? saved.value.getFavoriteDownlinks : []);
      if (saved.status === 'rejected') options.warnings.push('Saved commands could not be loaded. Close and reopen this panel to retry.');
      return options;
    },
    async send(device, draft, options) {
      const data = await request<{ sendDownlink: unknown }>(SEND_DOWNLINK_QUERY, { action: downlinkAction(device, draft, options) });
      const result = obj(data.sendDownlink);
      if (!str(result.type) || !str(result.message)) throw new Error('The server did not confirm the command result. Check device logs before trying again.');
      return { type: str(result.type), message: str(result.message), timestamp: str(result.timestamp) || undefined };
    },
  };
}
