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

export function BottomTabs({ active, onDevices, onProfile }: {
  active: 'Devices' | 'Profile'; onDevices: () => void; onProfile: () => void;
}) {
  return <View accessibilityRole="tablist" style={styles.tabs}>
    {tabs.map(tab => {
      const disabled = tab.label === 'Locations' || tab.label === 'Analytics';
      const selected = active === tab.label;
      const color = selected ? theme.colors.primary : '#AAAAAA';
      return <Pressable key={tab.label} accessibilityRole="tab"
        accessibilityLabel={disabled ? tab.label + ', coming soon' : tab.label}
        accessibilityState={{ selected, disabled }} disabled={disabled}
        onPress={tab.label === 'Devices' ? onDevices : onProfile}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}>
        <MaterialCommunityIcons name={tab.icon} size={23} color={color} />
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EEEEEE' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11 },
});
