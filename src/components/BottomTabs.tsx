import React, { type ComponentProps } from 'react';
import { useResponsiveLayout } from '../layout/responsive';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

type Tab = 'Projects' | 'Devices' | 'Locations' | 'Analytics' | 'Profile';
const tabs: { label: Tab; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { label: 'Projects', icon: 'view-grid-outline' },
  { label: 'Devices', icon: 'router-wireless' },
  { label: 'Locations', icon: 'map-outline' },
  { label: 'Analytics', icon: 'chart-bar' },
  { label: 'Profile', icon: 'account-outline' },
];

export function BottomTabs({ active, onDevices, onLocations, onAnalytics, onProfile, onProjects, projectSelected = true }: {
  onProjects?: () => void; projectSelected?: boolean;
  active: Tab; onDevices: () => void; onLocations: () => void; onAnalytics: () => void; onProfile: () => void;
}) {
  const { isTablet } = useResponsiveLayout();
  const actions: Record<Tab, (() => void) | undefined> = { Projects: onProjects, Devices: onDevices, Locations: onLocations, Analytics: onAnalytics, Profile: onProfile };
  const visibleTabs = tabs.filter(tab => tab.label === 'Projects' ? !!onProjects : tab.label === 'Profile' || projectSelected);
  return <View accessibilityRole="tablist" style={styles.tabs}>
    {visibleTabs.map(tab => {
      const selected = active === tab.label;
      const color = selected ? theme.colors.primary : '#AAAAAA';
      return <Pressable key={tab.label} accessibilityRole="tab" accessibilityLabel={tab.label}
        accessibilityState={{ selected }} onPress={actions[tab.label]}
        style={({ pressed }) => [styles.tab, isTablet && { flexDirection: 'row', gap: 10 }, pressed && { opacity: 0.6 }]}>
        <MaterialCommunityIcons name={tab.icon} size={23} color={color} />
        <Text style={[styles.label, isTablet && { fontSize: 14 }, { color }]}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EEEEEE' },
  tab: { flex: 1, minWidth: 0, paddingHorizontal: 4, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, flexShrink: 1, textAlign: 'center' },
});
