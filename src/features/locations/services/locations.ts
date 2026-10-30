import { demoLocations } from '../data/demoLocations';
import type { LocationsRepository } from '../types';

// Replace this adapter with authenticated device/location requests later.
export const demoLocationsRepository: LocationsRepository = {
  async listDevices() {
    return demoLocations.map(item => ({
      ...item,
      marker: { ...item.marker },
      point: { ...item.point },
      device: { ...item.device, readings: item.device.readings.map(reading => ({ ...reading })) },
    }));
  },
};
