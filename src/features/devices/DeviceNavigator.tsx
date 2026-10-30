import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { DeviceDetailsScreen } from './screens/DeviceDetailsScreen';
import { DeviceListScreen } from './screens/DeviceListScreen';
import type { Device } from './types';

export function DeviceNavigator({ onExit, preview, onProfile }: { onExit: () => void; preview: boolean; onProfile: () => void }) {
  const [selected, setSelected] = useState<Device | null>(null);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected) { setSelected(null); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [selected]);
  return selected ? <DeviceDetailsScreen key={selected.id} device={selected} onBack={() => setSelected(null)} /> : <DeviceListScreen onSelect={setSelected} onExit={onExit} preview={preview} onProfile={onProfile} />;
}
