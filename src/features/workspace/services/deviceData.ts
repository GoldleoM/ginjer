import type { Device, DeviceIcon } from '../../devices/types';
import type { OutputDefinition } from './deviceInspection';

export type DataTab = 'status' | 'configuration' | 'attributes';
export interface DataField { id: string; name: string; value: string; label: string; icon: DeviceIcon; color?: string; tone?: 'red' | 'yellow' | 'green' | 'neutral'; main: boolean; }
export function deviceDataFields(device: Device, definitions: OutputDefinition[] = [], mainOutputId = device.mainOutputId): Record<DataTab, DataField[]> {
  const groups: Record<DataTab, DataField[]> = { status: [], configuration: [], attributes: [] };
  const ids = [...new Set([...definitions.map(field => field.id), ...device.readings.map(field => field.id)])];
  for (const id of ids) {
    const reading = device.readings.find(field => field.id === id);
    const definition = definitions.find(field => field.id === id);
    const category = reading?.category || definition?.category;
    // Hidden hardware outputs must not be presented as ordinary status values.
    if (category === 'HIDDEN') continue;
    groups[category === 'CONFIGURATION_DATA' ? 'configuration' : 'status'].push({
      id, name: reading?.title || definition?.name || id, value: reading?.value ?? 'Not reported',
      label: reading?.label || (!reading ? 'No value received' : ''), icon: reading?.icon || (/battery/i.test(definition?.name || '') ? 'battery-outline' : 'chart-line'),
      color: reading?.color, main: id === mainOutputId,
    });
  }
  groups.attributes = (device.attributes || []).map(field => ({ id: field.id, name: field.name, value: field.value, label: '', icon: 'tune-variant', main: false }));
  return groups;
}
export function initialDataTab(groups: Record<DataTab, DataField[]>): DataTab {
  return groups.status.length ? 'status' : groups.configuration.length ? 'configuration' : groups.attributes.length ? 'attributes' : 'status';
}
export function deviceSummaryFields(device: Device): DataField[] {
  const reading = device.readings.find(reading => reading.id === device.mainOutputId && reading.category !== 'HIDDEN');
  if (!reading) return [];
  return [{
    id: 'output:' + reading.id, name: reading.title, value: reading.value, label: reading.label,
    icon: reading.icon, color: reading.color, tone: reading.tone, main: true,
  }];
}
