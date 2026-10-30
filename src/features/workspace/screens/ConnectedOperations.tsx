import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Operations } from '../useOperations';
import { notificationDevice, type Notification } from '../services/operations';
import { formatTime } from '../services/normalizers';
import { Feedback } from '../components/WorkspaceUI';

const human = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
export function NotificationBanner({ operations, devices, onDevice, onNotifications }: { operations: Operations; devices: Device[]; onDevice: (device: Device) => void; onNotifications: () => void }) {
  const [dismissed, setDismissed] = useState('');
  const active = operations.notifications.data.filter(item => item.status === 'ACTIVE');
  const latest = active[0];
  const key = operations.notifications.scope + ':' + latest?.id + ':' + latest?.count + ':' + active.length;
  if (!latest || operations.notifications.error || dismissed === key) return null;
  const device = notificationDevice(latest, devices, operations.scope);
  const title = operations.rules.data.find(item => item.id === latest.ruleId)?.name || 'Active notification';
  return <View accessibilityLiveRegion="polite" style={styles.banner}>
    <Pressable accessibilityRole="button" onPress={() => device ? onDevice(device) : onNotifications()} style={styles.bannerBody}><MaterialCommunityIcons name="bell-alert-outline" size={22} color="#94621B" /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={styles.bannerTitle}>{title}</Text><Text style={styles.caption}>{device?.name || 'Project notification'} / {active.length} active</Text></View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={onNotifications} style={styles.icon}><MaterialCommunityIcons name="chevron-right" size={23} color="#94621B" /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification banner" onPress={() => setDismissed(key)} style={styles.icon}><MaterialCommunityIcons name="close" size={20} color="#94621B" /></Pressable>
  </View>;
}
export function ConnectedNotifications({ operations, devices, onDevice }: { operations: Operations; devices: Device[]; onDevice: (device: Device) => void }) {
  const [filter, setFilter] = useState<Notification['status'] | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { notifications, rules } = operations;
  const name = (item: Notification) => rules.data.find(rule => rule.id === item.ruleId)?.name || 'Notification';
  const filtered = notifications.data.filter(item => (filter === 'ALL' || item.status === filter) && [name(item), notificationDevice(item, devices, operations.scope)?.name, ...item.values.map(value => value.label + ' ' + value.value)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <FlatList data={filtered.slice(0, limit)} keyExtractor={item => item.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={notifications.busy} onRefresh={operations.refresh} tintColor="#8BAE41" />}
    ListHeaderComponent={<View style={styles.stack}><Text accessibilityRole="header" style={styles.title}>Notifications</Text>
      <TextInput accessibilityLabel="Search notifications" value={query} onChangeText={value => { setQuery(value); setLimit(30); }} placeholder="Search notifications or devices" style={styles.search} autoCorrect={false} />
      <Pressable accessibilityRole="button" accessibilityLabel="Notification filters" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(value => !value)} style={styles.button}><Text style={styles.link}>Filter: {human(filter)}</Text></Pressable>
      {filtersOpen && <View style={styles.chips}>{(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'ARCHIVED'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => { setFilter(value); setLimit(30); }} style={[styles.chip, filter === value && styles.selected]}><Text style={styles.link}>{human(value)}</Text></Pressable>)}</View>}
      {!!notifications.error && <Feedback title="Unable to refresh notifications" message={notifications.error + (notifications.data.length ? ' Showing the last loaded notifications.' : '')} onRetry={operations.refresh} />}
      {!!rules.error && <Text style={styles.caption}>Rule names could not be loaded. Notification details remain available.</Text>}
      <Text style={styles.caption}>{filtered.length} notifications</Text>
    </View>}
    renderItem={({ item }) => {
      const device = notificationDevice(item, devices, operations.scope);
      return <Pressable accessibilityRole={device ? "button" : undefined} accessibilityLabel={device ? name(item) + ". Open " + device.name : undefined} disabled={!device} onPress={() => device && onDevice(device)} style={styles.notificationRow}>
        <View style={[styles.notificationIcon, { backgroundColor: item.status === 'ACTIVE' ? '#FCE9DF' : '#EFF5E4' }]}><MaterialCommunityIcons name="bell-outline" size={22} color={item.status === 'ACTIVE' ? '#F07556' : '#8BAE41'} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.notificationTitle}>{name(item)}</Text>
          {item.values.map((value, index) => <Text key={index} style={styles.caption}>{device?.readings.find(reading => reading.id === value.outputId)?.title || value.label || 'Output'}: {value.value || value.label || 'Not reported'}</Text>)}
          <Text style={styles.caption}>{device?.name || 'Project notification'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: 85 }}><View style={styles.notificationCount}><Text style={{ color: 'white', fontSize: 11 }}>{item.count}</Text></View><Text accessibilityLabel={formatTime(item.timestamp)} style={styles.notificationTime}>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Not reported'}</Text><Text style={styles.caption}>{human(item.status)}</Text></View>
      </Pressable>;

    }}
    ListEmptyComponent={notifications.busy && !notifications.data.length ? <Feedback busy /> : !notifications.error ? <Feedback title="No notifications" message={query || filter !== 'ALL' ? 'Try another search or status.' : 'No alerts have been returned for this project.'} /> : null}
    ListFooterComponent={limit < filtered.length ? <Pressable accessibilityRole="button" onPress={() => setLimit(value => value + 30)} style={styles.button}><Text style={styles.link}>Load more</Text></Pressable> : null} />;
}
export { ConnectedAutomation } from './ConnectedAutomation';
const styles = StyleSheet.create({
  notificationTime: { fontSize: 11, color: '#999999', lineHeight: 16 }, notificationRow: { flexDirection: 'row', gap: 12, backgroundColor: 'white', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' }, notificationIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, notificationTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#303030' }, notificationCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#8BAE41', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 12 }, stack: { gap: 12 }, title: { color: '#303030', fontSize: 22, fontWeight: '600' },
  caption: { color: '#777777', fontSize: 12, lineHeight: 19 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  search: { minHeight: 48, padding: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 9, color: '#303030', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#DDDDDD', backgroundColor: 'white' },
  selected: { borderColor: '#8BAE41', backgroundColor: '#F1F6E7' }, link: { color: '#6D941B', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  badge: { color: '#6D941B', fontSize: 12, fontWeight: '600' }, cardTitle: { color: '#303030', fontSize: 16, lineHeight: 24, fontWeight: '600', marginTop: 8 },
  deviceLink: { minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  button: { minHeight: 44, padding: 10, justifyContent: 'center' }, disabled: { opacity: 0.35 }, metric: { color: '#303030', fontSize: 25, fontWeight: '600' },
  run: { padding: 12, backgroundColor: '#F6F6F6', borderRadius: 9 }, banner: { marginHorizontal: 12, marginBottom: 8, flexDirection: 'row', backgroundColor: '#FFF5DE', borderRadius: 9, alignItems: 'center' },
  bannerBody: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }, bannerTitle: { color: '#76531D', fontSize: 13, lineHeight: 20, fontWeight: '600' }, icon: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
