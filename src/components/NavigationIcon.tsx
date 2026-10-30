import React, { type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

// Shared website-style symbols with consistent sizes and selection colors.
const icons = {
  Devices: 'router',
  Locations: 'public',
  Analytics: 'bar-chart',
  Automation: 'route',
  Notifications: 'notifications-active',
  Reports: 'description',
  Profile: 'person-outline',
  Health: 'monitor-heart',
} satisfies Record<string, ComponentProps<typeof MaterialIcons>['name']>;

export const navigationColors = { active: theme.colors.primary, inactive: '#707070', badge: '#F16050' };

export function NavigationIcon({ name, size = 24, color = navigationColors.inactive }: {
  name: keyof typeof icons; size?: number; color?: string;
}) {
  if (name === 'Analytics' || name === 'Reports') {
    return <MaterialCommunityIcons name={name === 'Analytics' ? 'chart-bar' : 'file-document-outline'} size={size} color={color} accessible={false} accessibilityElementsHidden importantForAccessibility="no" />;
  }
  return <MaterialIcons name={icons[name]} size={size} color={color} accessible={false} accessibilityElementsHidden importantForAccessibility="no" />;
}

export function NotificationCount({ count }: { count: number }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return <View accessible={false} style={styles.badge}><Text style={styles.count}>{count > 99 ? '99+' : Math.floor(count)}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: navigationColors.badge, alignItems: 'center', justifyContent: 'center' },
  count: { color: 'white', fontSize: 11, lineHeight: 16, fontWeight: '600' },
});
