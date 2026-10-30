import React, { useState } from 'react';
import { DeviceNavigator } from '../features/devices/DeviceNavigator';
import { ProfileNavigator } from '../features/profile/ProfileNavigator';
import { createDemoProfileRepository } from '../features/profile/services/profile';

export function MainNavigator({ onExit, preview }: { onExit: () => void; preview: boolean }) {
  const [tab, setTab] = useState<'devices' | 'profile'>('devices');
  const [profileRepository] = useState(createDemoProfileRepository);
  return tab === 'profile'
    ? <ProfileNavigator repository={profileRepository} onDevices={() => setTab('devices')} onLogout={onExit} />
    : <DeviceNavigator onExit={onExit} preview={preview} onProfile={() => setTab('profile')} />;
}
