import type { ImageSourcePropType } from 'react-native';
import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type DeviceIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];
export type Tone = 'green' | 'yellow' | 'red' | 'neutral';
export interface DeviceReading {
  category?: string;
  id: string;
  title: string;
  label: string;
  value: string;
  icon: DeviceIcon;
  tone: Tone;
  summary: string;
  color?: string;
}
export interface Device {
  id: string;
  name: string;
  hardwareId: string;
  image?: ImageSourcePropType;
  icon?: DeviceIcon;
  source?: 'live' | 'demo';
  description?: string;
  devEui?: string;
  networkId?: string;
  networkKeyId?: string;
  hardwareType?: string;
  organizationId?: string;
  projectId?: string;
  clusterId?: string;
  projectName?: string;
  clusterName?: string;
  timestamp?: string;
  deleted?: boolean;
  coordinates?: { lat: number; lng: number; placeName?: string };
  attributes?: { id: string; name: string; value: string }[];
  lastHeard: string;
  lastHeardDetail: string;
  location: string;
  mainOutput: string;
  mainOutputId?: string;
  networkInterface?: string;
  needsAttention: boolean;
  recent: boolean;
  readings: DeviceReading[];
}
