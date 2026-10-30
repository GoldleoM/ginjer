import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Workspace } from '../useWorkspace';
import { ResponsiveGrid } from '../../../layout/responsive';
import { DeviceThumbnail, Feedback, liveStyles } from '../components/WorkspaceUI';
import { deviceHealth, healthSummary, sortDevices, type HealthFilter } from '../services/deviceInsights';

const labels: Record<HealthFilter, string> = { all: 'Current devices', stale: 'No recent packets', unknown: 'Unknown last heard', attention: 'Red readings', noOutputs: 'No outputs', noLocation: 'No location' };
export function ConnectedHealth({ workspace, onSelect }: { workspace: Workspace; onSelect: (device: Device) => void }) {
  const [hours, setHours] = useState(24);
  const [filter, setFilter] = useState<HealthFilter>('all');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const summary = healthSummary(workspace.devices, hours, now);
  const devices = sortDevices(workspace.devices.filter(device => !device.deleted && (filter === 'all' || deviceHealth(device, hours, now)[filter])), 'oldest');
  return <FlatList data={devices} keyExtractor={device => device.id} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={workspace.devicesLoading} onRefresh={workspace.refresh} tintColor="#83AF23" />}
    ListHeaderComponent={<View style={styles.stack}><Text accessibilityRole="header" style={styles.title}>Device health</Text>
      <Text style={styles.caption}>Based on reported last-heard timestamps and output values. Devices may transmit infrequently; a missing recent packet does not confirm they are offline.</Text>
      <Text style={styles.label}>Check for packets within</Text><View style={styles.choices}>{[1, 24, 168].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: hours === value }} onPress={() => setHours(value)} style={[styles.chip, hours === value && styles.selected]}><Text style={styles.link}>{value === 168 ? '7 days' : value + ' hours'}</Text></Pressable>)}</View>
      <ResponsiveGrid minimumWidth={140} maximumColumns={3}>{(Object.keys(labels) as HealthFilter[]).map(key => <Pressable key={key} accessibilityRole="button" accessibilityLabel={labels[key] + ': ' + summary[key]} accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)} style={[liveStyles.card, filter === key && styles.selected]}><Text style={styles.number}>{summary[key]}</Text><Text style={styles.caption}>{labels[key]}</Text></Pressable>)}</ResponsiveGrid>
      <Text style={styles.label}>{labels[filter]} / {devices.length}</Text>
    </View>}
    renderItem={({ item }) => {
      const health = deviceHealth(item, hours, now);
      const issues = (Object.keys(health) as Exclude<HealthFilter, 'all'>[]).filter(key => health[key]);
      return <Pressable accessibilityRole="button" onPress={() => onSelect(item)} style={[liveStyles.card, styles.device]}><DeviceThumbnail device={item} /><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>{item.name}</Text><Text style={styles.caption}>Last heard: {item.lastHeard}</Text><Text style={[styles.caption, issues.length ? { color: '#94621B' } : { color: '#6D941B' }]}>{issues.length ? issues.map(key => labels[key]).join(' / ') : 'Recent packet, no red readings'}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color="#83AF23" /></Pressable>;
    }} ListEmptyComponent={<Feedback title="No devices in this group" message="Choose a different health check or time window." />} />;
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 28 }, stack: { gap: 14 }, title: { color: '#303030', fontSize: 22, fontWeight: '600' },
  caption: { color: '#777777', fontSize: 12, lineHeight: 20 }, label: { color: '#555555', fontSize: 14, fontWeight: '500' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#DDDDDD', backgroundColor: 'white' },
  selected: { borderColor: '#83AF23', backgroundColor: '#F1F6E7' }, link: { color: '#6D941B', fontSize: 13 }, number: { color: '#303030', fontSize: 26, fontWeight: '600' },
  device: { flexDirection: 'row', gap: 12, alignItems: 'center' }, name: { color: '#303030', fontSize: 15, fontWeight: '600', lineHeight: 22 },
});
