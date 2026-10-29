import type { Device, DeviceReading } from '../types';

function reading(id: string, icon: DeviceReading['icon'], tone: DeviceReading['tone'], summary: string, label: string, value: string): DeviceReading {
  return { id, title: 'Output Name', icon, tone, summary, label, value };
}
const battery = reading('battery', 'battery', 'green', 'Full', 'Battery', '3.70');

// Deliberately separate from API services: these are visual-preview fixtures only.
export const demoDevices: Device[] = [
  {
    id: 'cold-chain', name: 'Cold Chain', hardwareId: 'ECFAF446947298',
    image: require('../../../../assets/images/devices/cold-chain.png'),
    lastHeard: '50 Mins', lastHeardDetail: '50 minutes ago', location: 'Demo', mainOutput: 'Temperature', recent: true, needsAttention: false,
    readings: [reading('temperature', 'thermometer', 'yellow', 'Moderate', 'Temperature', '24 \u00B0C'), reading('humidity', 'water-outline', 'yellow', 'Humid', 'Humidity', '68%')],
  },
  {
    id: 'level-sensor', name: 'Level Sensor', hardwareId: 'ECFAF4469472DD',
    image: require('../../../../assets/images/devices/level-sensor.png'),
    lastHeard: '50 Mins', lastHeardDetail: '50 minutes ago', location: 'Demo', mainOutput: 'Level', recent: true, needsAttention: true,
    readings: [reading('level', 'water', 'red', 'Empty', 'Level', '0%'), battery],
  },
  {
    id: 'io-controller', name: 'IO Controller', hardwareId: 'ECFAF44694729A',
    image: require('../../../../assets/images/devices/io-controller.png'),
    lastHeard: '02 Feb 2024 02:25', lastHeardDetail: '02 Feb 2024 02:25', location: 'Demo', mainOutput: 'Switch', recent: false, needsAttention: false,
    readings: [reading('switch', 'lightbulb', 'green', 'ON', 'Switch', 'ON'), battery],
  },
  {
    id: 'panic-button', name: 'Panic Button', hardwareId: 'ECFAF44694729B',
    image: require('../../../../assets/images/devices/panic-button.png'),
    lastHeard: '02 Feb 2024 02:15', lastHeardDetail: '02 Feb 2024 02:15', location: 'Demo', mainOutput: 'SOS', recent: false, needsAttention: true,
    readings: [reading('sos', 'map-marker-alert', 'red', 'SOS', 'Alert', 'SOS'), reading('battery', 'battery-alert', 'red', 'Low', 'Battery', '2.10')],
  },
  {
    id: 'air-quality', name: 'Air Quality Sensor', hardwareId: 'ECFAF4469472CC',
    image: require('../../../../assets/images/devices/air-quality.png'),
    lastHeard: '02 Feb 2024 01:43', lastHeardDetail: '02 Feb 2024 01:43', location: 'Demo', mainOutput: 'Air Quality', recent: false, needsAttention: true,
    readings: [reading('air', 'air-filter', 'red', 'Poor', 'Air Quality', 'Poor'), battery],
  },
  {
    id: 'busylight', name: 'Busylight', hardwareId: '23456789021234',
    image: require('../../../../assets/images/devices/busylight.png'),
    lastHeard: '23 Aug 2024 20:24', lastHeardDetail: 'Fri, 23 Aug 2024, 20:24', location: 'Demo', mainOutput: 'Colour', recent: false, needsAttention: false,
    readings: [reading('colour', 'water', 'red', 'Red', 'Battery', '3.70'), battery, reading('humidity', 'water-outline', 'yellow', 'Humid', 'Battery', '3.70'), reading('light', 'lightbulb', 'green', 'ON', 'Battery', '3.70')],
  },
];
