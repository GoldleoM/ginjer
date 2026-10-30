import React, { useMemo, useState } from 'react';
import { ResponsiveGrid, useResponsiveColumns } from '../../../layout/responsive';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Workspace } from '../useWorkspace';
import { DeviceThumbnail, Feedback, liveStyles } from '../components/WorkspaceUI';
import { deviceDataFields, type DataField } from '../services/deviceData';

function Readings({ fields }: { fields: DataField[] }) {
  return <ResponsiveGrid minimumWidth={130} maximumColumns={3} gap={10}>{fields.map(field => {
    const state = [field.label, field.value].map(value => value.trim().toLowerCase()).find(value => value === 'on' || value === 'off');
    const color = state === 'on' ? '#256B38' : state === 'off' ? '#A52A24' : field.color || '#303030';
    return <View key={field.id} style={styles.reading}>
      <Text style={styles.readingName}>{field.name}</Text>
      <Text selectable style={[styles.value, { color }]}>{field.value || 'Not reported'}</Text>
      {!!field.label && field.label !== field.value && <Text style={[styles.readingLabel, { color }]}>{field.label}</Text>}
    </View>;
  })}</ResponsiveGrid>;
}
export function ConnectedAnalytics({ workspace, onSelect, onModules }: { workspace: Workspace; onSelect: (device: Device) => void; onModules: () => void }) {
  const { columns, itemStyle, onLayout } = useResponsiveColumns(420, 12, 12, 2);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const search = query.trim().toLowerCase();
    return workspace.devices.filter(device => !device.deleted).map(device => ({ device, fields: deviceDataFields(device) }))
      .filter(({ device, fields }) => [device.name, device.hardwareId, device.devEui, device.clusterName,
        ...Object.values(fields).flat().flatMap(field => [field.name, field.value, field.label])].join(' ').toLowerCase().includes(search));
  }, [workspace.devices, query]);
  return <View style={{ flex: 1, minHeight: 0 }} onLayout={onLayout}>
    <FlatList key={columns} numColumns={columns} columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      ListHeaderComponent={<View style={{ marginHorizontal: -12 }}>
        <View style={styles.header}><Text accessibilityRole="header" style={liveStyles.heading}>Analytics</Text>
          <Pressable accessibilityRole="button" onPress={onModules} style={styles.modules}><MaterialCommunityIcons name="view-grid-outline" size={18} color="#6D941B" /><Text style={styles.moduleText}>Modules</Text></Pressable>
        </View>
        <Text style={styles.caption}>Latest reported values by device: {groups.length} {groups.length === 1 ? 'device' : 'devices'}</Text>
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search readings and devices" placeholder="Search readings or devices" autoCorrect={false}
          style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
      </View>} data={groups} keyExtractor={item => item.device.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={workspace.devicesLoading} onRefresh={workspace.refresh} tintColor="#83AF23" />}
      renderItem={({ item: { device, fields } }) => <View style={itemStyle}><View style={liveStyles.card}>
        <View style={styles.identity}><DeviceThumbnail device={device} size={48} /><View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={styles.title}>{device.name}</Text>
          {!!device.clusterName && <Text style={styles.deviceName}>{device.clusterName}</Text>}
        </View><Pressable accessibilityRole="button" accessibilityLabel={'View details for ' + device.name} onPress={() => onSelect(device)} style={styles.info}><MaterialCommunityIcons name="chevron-right" size={24} color="#83AF23" /></Pressable></View>
        {!!fields.status.length && <View style={styles.section}><Text style={styles.sectionTitle}>Readings</Text><Readings fields={fields.status} /></View>}
        {!!fields.configuration.length && <View style={styles.section}><Text style={styles.sectionTitle}>Configuration</Text><Readings fields={fields.configuration} /></View>}
        {!!fields.attributes.length && <View style={styles.section}><Text style={styles.sectionTitle}>Attributes</Text><Readings fields={fields.attributes} /></View>}
        {!Object.values(fields).some(group => group.length) && <Text style={styles.empty}>No readings or attributes reported yet.</Text>}
        <View style={styles.footer}><Text style={styles.metadata}>Last heard: {device.lastHeard}</Text></View>
      </View></View>} ListEmptyComponent={<Feedback title="No devices found" message={query ? 'Try another reading or device name.' : 'There are no current devices in this project.'} />} />
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  modules: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, moduleText: { color: '#6D941B', fontSize: 13 },
  caption: { color: '#858585', fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  search: { minHeight: 46, backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 9, margin: 12, paddingHorizontal: 13, color: '#303030', fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 16, gap: 12 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: '#303030' }, deviceName: { fontSize: 12, color: '#858585', marginTop: 3 },
  section: { marginTop: 16, gap: 8 }, sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6C765D' },
  reading: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F7F9F5', borderWidth: 1, borderColor: '#E9EEE3', minHeight: 104 },
  readingName: { fontSize: 12, lineHeight: 18, color: '#687064' }, value: { fontSize: 22, lineHeight: 30, fontWeight: '600', marginTop: 8 }, readingLabel: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  footer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 }, metadata: { fontSize: 11, lineHeight: 17, color: '#858585' }, empty: { fontSize: 13, lineHeight: 20, color: '#858585', marginTop: 16 },
  info: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
