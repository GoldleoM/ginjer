import type { LocatedDevice, LocationFilter } from '../types';

export function filterLocations(devices: LocatedDevice[], query: string, filter: LocationFilter): LocatedDevice[] {
  const search = query.trim().toLowerCase();
  return devices.filter(item => {
    const matchesQuery = item.device.name.toLowerCase().includes(search) || item.device.hardwareId.toLowerCase().includes(search);
    const matchesFilter = filter === 'all'
      || (filter === 'bins' && item.marker.kind === 'bin')
      || (filter === 'temperature' && (item.marker.kind === 'temperature' || item.marker.kind === 'celsius'))
      || (filter === 'other' && item.marker.kind === 'water')
      || (filter === 'attention' && item.device.needsAttention);
    return matchesQuery && matchesFilter;
  });
}
