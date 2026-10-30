import type { AnalyticsDashboard } from '../types';

// Historical reference values, not live telemetry. Dates include an explicit offset.
export const demoDashboards: AnalyticsDashboard[] = [
  {
    id: 'public',
    name: 'Public Dashboard',
    metrics: [
      {
        id: 'waste-fill', kind: 'gauge', title: 'Waste Bin (Fill Level%)',
        value: 1, minimum: 0, maximum: 1.3, deviceId: '64E124538D2870CC',
        recordedAt: '2024-02-02T03:50:00+05:30',
        description: 'Sample waste-bin fill-level reading. The gauge uses the reference scale of 0 to 1.3.',
      },
      {
        id: 'desk-occupancy', kind: 'status', title: 'Desk occupancy',
        value: 'Occupied', deviceId: '24E124538D2870FF',
        recordedAt: '2024-02-02T02:25:00+05:30',
        description: 'Sample occupancy sensor state for the desk.',
      },
      {
        id: 'valve-one', kind: 'status', title: 'Valve Status',
        value: 'Off', deviceId: '24E124538D2870CC',
        recordedAt: '2024-02-02T02:25:00+05:30',
        description: 'Sample state of the first valve. This dashboard displays readings only.',
      },
      {
        id: 'valve-two', kind: 'status', title: 'Valve Status',
        value: 'Off', deviceId: '24E124538D2870CD',
        recordedAt: '2024-02-02T02:25:00+05:30',
        description: 'Sample state of the second valve. This dashboard displays readings only.',
      },
    ],
  },
  {
    id: 'office',
    name: 'Office Dashboard',
    metrics: [
      {
        id: 'office-waste', kind: 'gauge', title: 'Waste Bin (Fill Level%)',
        value: 0.45, minimum: 0, maximum: 1.3, deviceId: '64E124538D2870DD',
        recordedAt: '2024-02-02T04:10:00+05:30',
        description: 'Sample waste-bin fill-level reading for the office.',
      },
      {
        id: 'office-desk', kind: 'status', title: 'Desk occupancy',
        value: 'Available', deviceId: '24E124538D2870EE',
        recordedAt: '2024-02-02T04:05:00+05:30',
        description: 'Sample occupancy sensor state for the office desk.',
      },
      {
        id: 'office-valve', kind: 'status', title: 'Valve Status',
        value: 'On', deviceId: '24E124538D2870DE',
        recordedAt: '2024-02-02T04:00:00+05:30',
        description: 'Sample state of the office valve. This dashboard displays readings only.',
      },
    ],
  },
];
