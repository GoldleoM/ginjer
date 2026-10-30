import React, { useState } from 'react';
import { AnalyticsScreen } from '../features/analytics/screens/AnalyticsScreen';
import { demoAnalyticsRepository } from '../features/analytics/services/analytics';
import { DeviceNavigator } from '../features/devices/DeviceNavigator';
import { ProfileNavigator } from '../features/profile/ProfileNavigator';
import { createDemoProfileRepository } from '../features/profile/services/profile';

export function MainNavigator({ onExit, preview }: { onExit: () => void; preview: boolean }) {
  const [tab, setTab] = useState<'devices' | 'analytics' | 'profile'>('devices');
  const [dashboardId, setDashboardId] = useState('public');
  const [profileRepository] = useState(createDemoProfileRepository);
  const onDevices = () => setTab('devices');
  const onAnalytics = () => setTab('analytics');
  const onProfile = () => setTab('profile');
  if (tab === 'analytics') return <AnalyticsScreen repository={demoAnalyticsRepository} dashboardId={dashboardId}
    onDashboardChange={setDashboardId} onDevices={onDevices} onProfile={onProfile} />;
  if (tab === 'profile') return <ProfileNavigator repository={profileRepository} onDevices={onDevices} onAnalytics={onAnalytics} onLogout={onExit} />;
  return <DeviceNavigator onExit={onExit} preview={preview} onProfile={onProfile} onAnalytics={onAnalytics} />;
}
