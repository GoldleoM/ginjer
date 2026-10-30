import { demoDevices } from '../../devices/data/demoDevices';
import type { LocatedDevice, MarkerKind, MarkerTone } from '../types';

function located(id: string, baseId: string, name: string, hardwareId: string, kind: MarkerKind, tone: MarkerTone, x: number, y: number): LocatedDevice {
  const base = demoDevices.find(device => device.id === baseId);
  if (!base) throw new Error('Missing sample device: ' + baseId);
  return {
    id,
    device: { ...base, id, name, hardwareId, readings: base.readings.map(reading => ({ ...reading })) },
    marker: { kind, tone },
    point: { x, y },
  };
}

// The source-map crop and these display positions follow the supplied reference.
// They are illustrative positions, not a list of real device coordinates.
export const demoLocations: LocatedDevice[] = [
  located('level-sensor', 'level-sensor', 'Level Sensor', 'ECFAF4469472DD', 'bin', 'green', 0.16, 0.44),
  located('central-temperature', 'cold-chain', 'Temperature Sensor · Central', 'ECFAF446947201', 'temperature', 'red', 0.51, 0.50),
  located('east-bin', 'level-sensor', 'Level Sensor · East', 'ECFAF446947202', 'bin', 'orange', 0.84, 0.49),
  located('west-temperature', 'cold-chain', 'Temperature Sensor · West', 'ECFAF446947203', 'temperature', 'red', 0.14, 0.56),
  located('temperature-monitor', 'cold-chain', 'Temperature Monitor', 'ECFAF446947204', 'temperature', 'yellow', 0.35, 0.59),
  located('water-monitor', 'level-sensor', 'Water Level Sensor', 'ECFAF446947205', 'water', 'blue', 0.67, 0.68),
  located('west-cold-chain', 'cold-chain', 'Cold Chain · West', 'ECFAF446947206', 'celsius', 'red', 0.24, 0.75),
  located('south-cold-chain', 'cold-chain', 'Cold Chain · South', 'ECFAF446947207', 'celsius', 'orange', 0.45, 0.83),
  located('south-bin', 'level-sensor', 'Level Sensor · South', 'ECFAF446947208', 'bin', 'red', 0.62, 0.80),
  located('coastal-bin', 'level-sensor', 'Level Sensor · Coast', 'ECFAF446947209', 'bin', 'green', 0.18, 0.89),
];
