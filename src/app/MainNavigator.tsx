import React, { useState } from 'react';
import type { AuthUser } from '../features/auth/types';
import { ConnectedNavigator } from './ConnectedNavigator';
import { AnalyticsScreen } from '../features/analytics/screens/AnalyticsScreen';
import { demoAnalyticsRepository } from '../features/analytics/services/analytics';
import { DeviceNavigator } from '../features/devices/DeviceNavigator';
import { LocationsScreen } from '../features/locations/screens/LocationsScreen';
import { demoLocationsRepository } from '../features/locations/services/locations';
import { ProfileNavigator } from '../features/profile/ProfileNavigator';
import { createDemoProfileRepository } from '../features/profile/services/profile';
import type { AccountIdentity } from '../features/auth/services/accountApi';

function DemoNavigator({ onExit, preview }: { onExit: () => void; preview: boolean }) {
  const [tab, setTab] = useState<'devices' | 'locations' | 'analytics' | 'profile'>('devices');
  const [dashboardId, setDashboardId] = useState('public');
  const [profileRepository] = useState(createDemoProfileRepository);
  const onDevices = () => setTab('devices');
  const onLocations = () => setTab('locations');
  const onAnalytics = () => setTab('analytics');
  const onProfile = () => setTab('profile');
  if (tab === 'locations') return <LocationsScreen repository={demoLocationsRepository} onDevices={onDevices} onAnalytics={onAnalytics} onProfile={onProfile} />;
  if (tab === 'analytics') return <AnalyticsScreen repository={demoAnalyticsRepository} dashboardId={dashboardId}
    onDashboardChange={setDashboardId} onDevices={onDevices} onLocations={onLocations} onProfile={onProfile} />;
  if (tab === 'profile') return <ProfileNavigator repository={profileRepository} onDevices={onDevices} onLocations={onLocations} onAnalytics={onAnalytics} onLogout={onExit} />;
  return <DeviceNavigator onExit={onExit} preview={preview} onLocations={onLocations} onProfile={onProfile} onAnalytics={onAnalytics} />;
}

export function MainNavigator({ user, preview, onExit, onUserUpdated }: { user: AuthUser | null; preview: boolean; onExit: () => void; onUserUpdated: (identity: AccountIdentity) => void }) {
  if (preview) return <DemoNavigator preview onExit={onExit} />;
  return user ? <ConnectedNavigator key={user._id} user={user} onExit={onExit} onUserUpdated={onUserUpdated} /> : null;
}
