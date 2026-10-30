import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationIcon, navigationColors } from './NavigationIcon';

type Tab = 'Devices' | 'Locations' | 'Analytics' | 'Profile';
const tabs: Tab[] = ['Devices', 'Locations', 'Analytics', 'Profile'];

export function BottomTabs({ active, onDevices, onLocations, onAnalytics, onProfile }: {
  active: Tab | 'Projects' | 'Notifications' | 'Automation' | 'Health'; onDevices: () => void; onLocations: () => void; onAnalytics: () => void; onProfile: () => void;
}) {
  const actions: Record<Tab, () => void> = { Devices: onDevices, Locations: onLocations, Analytics: onAnalytics, Profile: onProfile };
  return <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={styles.tabs}>
    {tabs.map(tab => {
      const selected = active === tab;
      const color = selected ? navigationColors.active : navigationColors.inactive;
      return <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={tab}
        accessibilityState={{ selected }} aria-selected={selected} onPress={actions[tab]}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}>
        <NavigationIcon name={tab} size={25} color={color} />
        <Text style={[styles.label, { color }]}>{tab}</Text>
        {selected && <View style={styles.activeIndicator} />}
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexShrink: 0, flexDirection: 'row', backgroundColor: 'white', paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EEEEEE' },
  tab: { flex: 1, minWidth: 0, paddingHorizontal: 4, paddingBottom: 4, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  activeIndicator: { position: 'absolute', bottom: 0, width: 36, height: 3, borderRadius: 2, backgroundColor: navigationColors.active },
  label: { fontSize: 10, flexShrink: 1, textAlign: 'center' },
});
