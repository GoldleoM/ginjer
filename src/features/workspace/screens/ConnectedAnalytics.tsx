import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Workspace } from '../useWorkspace';
import { Feedback, liveStyles } from '../components/WorkspaceUI';
import { deviceDataFields, type DataField } from '../services/deviceData';

function ReadingRow({ field }: { field: DataField }) {
  const state = [field.label, field.value].map(value => value.trim().toLowerCase()).find(value => value === 'on' || value === 'off');
  const color = state === 'on' ? '#256B38' : state === 'off' ? '#A52A24' : field.color || '#303030';
  return <View style={styles.reading}>
    <Text style={styles.readingName}>{field.name}</Text>
    <View style={styles.result}>
      <Text selectable style={[styles.value, { color }]}>{field.value || 'Not reported'}</Text>
      {!!field.label && field.label !== field.value && <Text style={[styles.status, { color }]}>{field.label}</Text>}
    </View>
  </View>;
}
export function ConnectedAnalytics({ workspace, onSelect, onModules }: { workspace: Workspace; onSelect: (device: Device) => void; onModules: () => void }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const search = query.trim().toLowerCase();
    return workspace.devices.filter(device => !device.deleted).map(device => ({ device, readings: deviceDataFields(device).status }))
      .filter(({ device, readings }) => [device.name, ...readings.flatMap(field => [field.name, field.value, field.label])].join(' ').toLowerCase().includes(search));
  }, [workspace.devices, query]);
  return <FlatList style={{ flex: 1, minHeight: 0 }}
    ListHeaderComponent={<>
      <View style={styles.header}><Text accessibilityRole="header" style={liveStyles.heading}>Analytics</Text>
        <Pressable accessibilityRole="button" onPress={onModules} style={styles.modules}><MaterialCommunityIcons name="view-grid-outline" size={18} color="#6D941B" /><Text style={styles.moduleText}>Modules</Text></Pressable>
      </View>
      <Text style={styles.caption}>Current readings and status</Text>
      <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search readings and devices" placeholder="Search readings or devices" autoCorrect={false}
        style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
    </>} data={groups} keyExtractor={item => item.device.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={workspace.devicesLoading} onRefresh={workspace.refresh} tintColor="#83AF23" />}
    renderItem={({ item: { device, readings } }) => <View style={styles.deviceSection}>
      <Pressable accessibilityRole="button" accessibilityLabel={'View details for ' + device.name} onPress={() => onSelect(device)} style={styles.deviceHeading}>
        <Text style={styles.deviceName}>{device.name}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#83AF23" />
      </Pressable>
      {readings.map(field => <ReadingRow key={field.id} field={field} />)}
      {!readings.length && <Text style={styles.empty}>No current readings reported.</Text>}
    </View>} ListEmptyComponent={<Feedback title="No devices found" message={query ? 'Try another reading or device name.' : 'There are no current devices in this project.'} />} />;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  modules: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, moduleText: { color: '#6D941B', fontSize: 13 },
  caption: { color: '#858585', fontSize: 12, marginBottom: 12 },
  search: { minHeight: 46, backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 9, marginBottom: 12, paddingHorizontal: 13, color: '#303030', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 24 }, deviceSection: { marginBottom: 20 },
  deviceHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderBottomColor: '#DDE6CD', paddingVertical: 10 },
  deviceName: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#303030' },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDDDDD' },
  readingName: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 21, color: '#62685D' },
  result: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', columnGap: 16, rowGap: 4 },
  value: { flexShrink: 1, fontSize: 16, lineHeight: 23, fontWeight: '600' }, status: { flexShrink: 1, fontSize: 13, lineHeight: 20 },
  empty: { fontSize: 13, lineHeight: 20, color: '#858585', paddingVertical: 12 },
});
