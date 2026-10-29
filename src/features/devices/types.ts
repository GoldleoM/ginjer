import type { ImageSourcePropType } from 'react-native';
import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type DeviceIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];
export type Tone = 'green' | 'yellow' | 'red';
export interface DeviceReading {
  id: string;
  title: string;
  label: string;
  value: string;
  icon: DeviceIcon;
  tone: Tone;
  summary: string;
}
export interface Device {
  id: string;
  name: string;
  hardwareId: string;
  image: ImageSourcePropType;
  lastHeard: string;
  lastHeardDetail: string;
  location: string;
  mainOutput: string;
  needsAttention: boolean;
  recent: boolean;
  readings: DeviceReading[];
}
