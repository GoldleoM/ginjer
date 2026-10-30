import type { Device } from '../devices/types';

export type MarkerKind = 'bin' | 'temperature' | 'water' | 'celsius';
export type MarkerTone = 'green' | 'orange' | 'red' | 'yellow' | 'blue';
export type LocationFilter = 'all' | 'bins' | 'temperature' | 'other' | 'attention';
export interface LocatedDevice {
  id: string;
  device: Device;
  marker: { kind: MarkerKind; tone: MarkerTone };
  // Normalized design positions within the static India map crop, not GPS.
  point: { x: number; y: number };
}
export interface LocationsRepository {
  listDevices(): Promise<LocatedDevice[]>;
}
