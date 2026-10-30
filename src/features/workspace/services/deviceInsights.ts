import type { Device } from '../../devices/types';
import type { DevicePacket } from './deviceInspection';

export type HealthFilter = 'all' | 'stale' | 'unknown' | 'attention' | 'noOutputs' | 'noLocation';
export function deviceHealth(device: Device, staleHours = 24, now = Date.now()) {
  const heard = Date.parse(device.timestamp || '');
  const validTime = Number.isFinite(heard) && heard <= now + 5 * 60000;
  return {
    stale: validTime && now - heard > staleHours * 3600000,
    unknown: !validTime,
    attention: device.readings.some(reading => reading.tone === 'red'),
    noOutputs: !device.readings.length,
    noLocation: !device.coordinates,
  };
}
export function healthSummary(devices: Device[], staleHours = 24, now = Date.now()) {
  return devices.filter(device => !device.deleted).reduce((summary, device) => {
    const health = deviceHealth(device, staleHours, now); summary.all++;
    for (const key of ['stale', 'unknown', 'attention', 'noOutputs', 'noLocation'] as const) if (health[key]) summary[key]++;
    return summary;
  }, { all: 0, stale: 0, unknown: 0, attention: 0, noOutputs: 0, noLocation: 0 });
}
export type DeviceSort = 'name' | 'newest' | 'oldest';
export function sortDevices(devices: Device[], sort: DeviceSort) {
  return [...devices].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    const first = Date.parse(a.timestamp || ''), second = Date.parse(b.timestamp || '');
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : a.name.localeCompare(b.name);
    if (!Number.isFinite(second)) return -1;
    return (sort === 'oldest' ? first - second : second - first) || a.name.localeCompare(b.name);
  });
}
export interface TrendPoint { id: string; timestamp: string; value: number; }
export interface TrendSeries { id: string; name: string; points: TrendPoint[]; min: number; max: number; average: number; }
function numeric(value: unknown): number | undefined {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) value = (value as Record<string, unknown>).value;
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return;
  const number = Number(value); return Number.isFinite(number) ? number : undefined;
}
export function packetTrends(packets: DevicePacket[], device: Device): TrendSeries[] {
  const series = new Map<string, TrendPoint[]>();
  for (const packet of packets) {
    if (packet.deviceId !== device.id || !packet.timestamp || !Number.isFinite(Date.parse(packet.timestamp))) continue;
    for (const [id, raw] of Object.entries(packet.outputs)) {
      const value = numeric(raw); if (value === undefined) continue;
      const points = series.get(id) || []; points.push({ id: packet.id, timestamp: packet.timestamp, value }); series.set(id, points);
    }
  }
  return [...series.entries()].map(([id, points]) => {
    points.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const values = points.map(point => point.value);
    return { id, name: device.readings.find(reading => reading.id === id)?.title || id, points,
      min: Math.min(...values), max: Math.max(...values), average: values.reduce((total, value) => total + value / values.length, 0) };
  });
}
