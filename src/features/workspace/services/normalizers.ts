import type { Device, DeviceIcon, DeviceReading, Tone } from '../../devices/types';
import type { Account, Coordinates, Module, ProjectOverview } from '../types';

export type DataRecord = Record<string, unknown>;
export function record(value: unknown): DataRecord { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : {}; }
export function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
export function text(value: unknown, fallback = ''): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') { try { return JSON.stringify(value); } catch { return fallback; } }
  return String(value);
}
export function displayValue(value: unknown): string { return text(value, 'Not reported'); }
export function coordinates(value: unknown): Coordinates | undefined {
  const data = record(value);
  if (data.lat === null || data.lat === undefined || data.lat === '' || data.lng === null || data.lng === undefined || data.lng === '') return undefined;
  const numeric = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && !!value.trim());
  if (!numeric(data.lat) || !numeric(data.lng)) return undefined;
  const lat = Number(data.lat), lng = Number(data.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng, placeName: text(data.placeName) } : undefined;
}
export function timestamp(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value)) ? Number(value) : NaN;
  const date = new Date(Number.isFinite(numeric) ? (numeric < 100000000000 ? numeric * 1000 : numeric) : String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export function formatTime(value?: string): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not reported';
}
function count(value: unknown, key: string) { return list(value).reduce<number>((sum, item) => sum + (Number(record(item)[key]) || 0), 0); }
export function normalizeAccounts(value: unknown): Account[] {
  return list(value).map(item => {
    const data = record(item);
    return { id: text(data.organisationId), name: text(data.name, 'Unnamed organization'), active: data.isActive === true, accepted: data.isAccepted === true, admin: data.isAdmin === true };
  }).filter(item => !!item.id);
}
export function normalizeProjects(value: unknown): ProjectOverview[] {
  return list(value).map(item => {
    const data = record(item);
    return { id: text(data._id), name: text(data.name, 'Unnamed project'), description: text(data.description),
      active: data.active === true, organizationId: text(data.organisationId), location: coordinates(data.location),
      users: count(data.userCount, 'userCount'), devices: count(data.deviceCount, 'deviceCount'), clusters: count(data.clusterCount, 'clusterCount'),
      nonLoRaWANDevices: count(data.nonLoRaWANDeviceCount, 'nonLoRaWANDeviceCount') };
  }).filter(item => !!item.id);
}
function readingTone(value: unknown): Tone {
  const color = text(value).toLowerCase();
  if (/red|#f00(?:000)?$|#ff0000|#ff624f|#ed6652|#f44336/.test(color)) return 'red';
  if (/yellow|orange|#ffcc32|#ffc107|#ff9800/.test(color)) return 'yellow';
  if (/green|#83af23|#9bd14f|#4caf50|#00ff00/.test(color)) return 'green';
  return 'neutral';
}
function safeColor(value: unknown): string | undefined {
  const color = text(value).trim();
  return /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|red|green|yellow|orange|blue|gray|grey|black|white)$/i.test(color) ? color : undefined;
}
function iconFor(name: string): DeviceIcon {
  if (/temp|°c|celsius/i.test(name)) return 'thermometer';
  if (/battery|power supply/i.test(name)) return 'battery-outline';
  if (/humid|water|level/i.test(name)) return 'water-outline';
  if (/alarm|alert|fault/i.test(name)) return 'alert-circle-outline';
  if (/switch|valve|relay/i.test(name)) return 'toggle-switch-outline';
  return 'chart-line';
}
export function normalizeDevices(value: unknown, now = Date.now()): Device[] {
  const found = new Map<string, Device>();
  for (const projectValue of list(value)) {
    const project = record(projectValue);
    for (const clusterValue of list(project.clusters)) {
      const cluster = record(clusterValue);
      for (const deviceValue of list(cluster.devices)) {
        const data = record(deviceValue), id = text(data._id);
        if (!id) continue;
        const date = timestamp(data.timestamp), position = coordinates(data.position);
        const readings: DeviceReading[] = list(data.outputs).map((outputValue, index) => {
          const output = record(outputValue), name = text(output.outputName, 'Output ' + (index + 1)), label = text(output.label);
          const value = displayValue(output.value);
          return { id: text(output.outputId, id + '-output-' + index), title: name, label, value, category: text(output.outputModuleType) || undefined,
            summary: label && label !== value ? value + ' · ' + label : value, icon: iconFor(name), tone: readingTone(output.color), color: safeColor(output.color) };
        });
        const age = date ? now - new Date(date).getTime() : Infinity;
        found.set(id, { id, name: text(data.name, 'Unnamed device'), hardwareId: text(data.hardwareId, text(data.devEui, 'Not reported')),
          icon: iconFor(text(data.hardwareType) + ' ' + readings.map(item => item.title).join(' ')),
          source: 'live', lastHeard: formatTime(date), lastHeardDetail: formatTime(date), timestamp: date,
          location: text(record(data.position).placeName, 'Not reported'), coordinates: position,
          mainOutputId: text(data.mainOutputId) || undefined, networkInterface: text(data.networkInterface) || undefined,
          mainOutput: data.mainOutputId ? readings.find(reading => reading.id === text(data.mainOutputId))?.title ?? 'Not reported' : readings[0]?.title ?? 'No outputs', recent: age >= 0 && age <= 86400000, needsAttention: readings.some(item => item.tone === 'red'),
          readings, description: text(data.description), devEui: text(data.devEui), networkKeyId: text(data.networkKeyId) || undefined, networkId: text(data.networkId),
          hardwareType: text(data.hardwareType), organizationId: text(data.organisationId), projectId: text(data.projectId, text(project._id)),
          clusterId: text(data.clusterId, text(cluster._id)), projectName: text(project.name), clusterName: text(cluster.name),
          deleted: data.deleted === true,
          attributes: list(data.attributes).map((item, index) => { const attribute = record(item); return {
            id: text(attribute.attributeId, id + '-attribute-' + index), name: text(attribute.attributeName, 'Attribute ' + (index + 1)), value: displayValue(attribute.value),
          }; }),
        });
      }
    }
  }
  return [...found.values()];
}
export function normalizeModules(value: unknown): Module[] {
  return list(value).map(item => { const data = record(item); return {
    id: text(data._id), name: text(data.label, 'Unnamed module'), type: text(data.moduleType, 'Not reported'), organizationId: data.organisationId == null ? null : text(data.organisationId),
  }; }).filter(item => !!item.id);
}
export function withHardwareImages(devices: Device[], hardwareItems: unknown, organizationId: string): Device[] {
  const images = new Map<string, string>();
  for (const value of list(hardwareItems)) {
    const hardware = record(value), uri = text(record(hardware.image).location);
    if (hardware.deleted === true || (hardware.organisationId != null && hardware.organisationId !== organizationId)) continue;
    if (hardware._id && /^https:\/\//i.test(uri)) images.set(text(hardware._id), uri);
  }
  return devices.map(device => {
    const uri = device.organizationId === organizationId ? images.get(device.hardwareId) : undefined;
    return uri ? { ...device, image: { uri } } : device;
  });
}
