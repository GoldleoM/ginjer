import type { Device, DeviceIcon } from '../../devices/types';
import { deviceSummaryFields } from './deviceData';

// Flat, filled symbols and soft color halos from the Locations design.
export function mapMarkerAppearance(device: Device): { icon: DeviceIcon; solid: string; halo: string } {
  const main = deviceSummaryFields(device)[0];
  const name = [device.name, device.hardwareType, device.mainOutput, main?.name].join(' ');
  let icon: DeviceIcon = main?.icon || device.icon || 'router-wireless';
  if (/waste|\bbin\b|trash/i.test(name)) icon = 'delete';
  else if (/busy.?light|\blight\b|colour|color/i.test(name)) icon = 'lightbulb';
  else if (/panic|\bsos\b|alarm|alert/i.test(name)) icon = 'alarm-light';
  else if (/temperature|cold chain|thermo/i.test(name)) icon = 'thermometer';
  else if (/water|humidity|level/i.test(name)) icon = 'water';
  else if (/air|odor|ammonia|co2|gas/i.test(name)) icon = 'air-filter';
  else if (/relay|switch|valve/i.test(name)) icon = 'toggle-switch';
  const palette = main?.tone === 'red' ? ['#ED6652', '#F9DDD7']
    : main?.tone === 'yellow' ? ['#E9CF50', '#FAF2CD']
    : main?.tone === 'green' ? ['#9DBD62', '#E7EED9'] : ['#7DB6F7', '#DFECFC'];
  return { icon, solid: palette[0], halo: palette[1] };
}
