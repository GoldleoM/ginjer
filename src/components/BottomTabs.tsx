import React, { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

type Tab = 'Devices' | 'Locations' | 'Analytics' | 'Profile';
const tabs: { label: Tab; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { label: 'Devices', icon: 'router-wireless' },
  { label: 'Locations', icon: 'map-outline' },
  { label: 'Analytics', icon: 'chart-bar' },
  { label: 'Profile', icon: 'account-outline' },
];

export function BottomTabs({ active, onDevices, onLocations, onAnalytics, onProfile }: {
  active: Tab | 'Projects' | 'Notifications' | 'Automation' | 'Health'; onDevices: () => void; onLocations: () => void; onAnalytics: () => void; onProfile: () => void;
}) {
  const actions: Record<Tab, () => void> = { Devices: onDevices, Locations: onLocations, Analytics: onAnalytics, Profile: onProfile };
  return <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={styles.tabs}>
    {tabs.map(tab => {
      const selected = active === tab.label;
      const color = selected ? theme.colors.primary : '#AAAAAA';
      return <Pressable key={tab.label} accessibilityRole="tab" accessibilityLabel={tab.label}
        accessibilityState={{ selected }} aria-selected={selected} onPress={actions[tab.label]}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}>
        <MaterialCommunityIcons name={tab.icon} size={21} color={color} />
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexShrink: 0, flexDirection: 'row', backgroundColor: 'white', paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EEEEEE' },
  tab: { flex: 1, minWidth: 0, paddingHorizontal: 4, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10, flexShrink: 1, textAlign: 'center' },
});
