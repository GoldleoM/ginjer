import React, { useMemo, useState } from 'react';
import { useResponsiveColumns } from '../../../layout/responsive';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Workspace } from '../useWorkspace';
import { DeviceThumbnail, Feedback, liveStyles } from '../components/WorkspaceUI';
import { formatTime } from '../services/normalizers';
import { sortDevices, type DeviceSort } from '../services/deviceInsights';
import { deviceSummaryFields } from '../services/deviceData';

export function ConnectedDevices({ workspace, onSelect }: { workspace: Workspace; onSelect: (device: Device) => void }) {
  const { columns, itemStyle, onLayout } = useResponsiveColumns();
  const [query, setQuery] = useState('');
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState<DeviceSort>('name');
  const listColumns = compact ? 1 : columns;
  const [filter, setFilter] = useState<'current' | 'recent' | 'attention' | 'archived'>('current');
  const devices = useMemo(() => sortDevices(workspace.devices.filter(device =>
    (filter === 'archived' ? device.deleted : !device.deleted)
    && (filter !== 'recent' || device.recent) && (filter !== 'attention' || device.needsAttention)
    && (device.name + ' ' + device.id + ' ' + device.hardwareId + ' ' + device.devEui + ' ' + device.clusterName).toLowerCase().includes(query.trim().toLowerCase())
  ), sort), [workspace.devices, query, filter, sort]);
  return <View style={{ flex: 1, minHeight: 0 }} onLayout={onLayout}>
    <FlatList key={listColumns} numColumns={listColumns} columnWrapperStyle={listColumns > 1 ? { gap: 12 } : undefined}
      ListHeaderComponent={<View style={{ marginHorizontal: -12 }}>
    <View style={styles.searchBox}><MaterialCommunityIcons name="magnify" size={23} color="#858585" />
      <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search devices by name, ID, or cluster" placeholder="Search Devices" autoCapitalize="none" autoCorrect={false}
        style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear device search" onPress={() => setQuery('')} style={styles.clear}><MaterialCommunityIcons name="close" size={22} color="#858585" /></Pressable>}
    </View>
    <View style={[styles.filters, { marginBottom: 8 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={compact ? 'Show expanded device cards' : 'Show compact device rows'} onPress={() => setCompact(value => !value)} style={styles.chip}><Text style={styles.chipText}>{compact ? 'View: Compact' : 'View: Expanded'}</Text></Pressable>
      {([['name', 'Name'], ['newest', 'Newest heard'], ['oldest', 'Oldest heard']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="button" accessibilityLabel={'Sort devices by ' + label} accessibilityState={{ selected: sort === id }} onPress={() => setSort(id)} style={[styles.chip, sort === id && styles.selectedChip]}><Text style={styles.chipText}>{label}</Text></Pressable>)}
    </View>
    <View style={styles.filters}>{([['current', 'All devices'], ['recent', 'Last 24 hours'], ['attention', 'Red readings'], ['archived', 'Archived']] as const).map(([id, label]) =>
      <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: id === filter }} onPress={() => setFilter(id)}
        style={[styles.chip, id === filter && styles.selectedChip]}><Text style={[styles.chipText, id === filter && { color: '#6D941B' }]}>{label}</Text></Pressable>)}</View>
    <Text style={styles.count}>{devices.length} {devices.length === 1 ? 'device' : 'devices'}{workspace.updatedAt ? ' · Updated ' + formatTime(workspace.updatedAt) : ''}</Text>
      </View>} data={devices} keyExtractor={device => device.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={workspace.devicesLoading} onRefresh={workspace.refresh} tintColor="#83AF23" />}
      renderItem={({ item: device }) => <View style={compact ? { width: '100%' } : itemStyle}><Pressable accessibilityRole="button" accessibilityLabel={device.name + ', ' + device.hardwareId + '. View details'}
        onPress={() => onSelect(device)} style={({ pressed }) => [liveStyles.card, pressed && { opacity: 0.7 }]}>
        <View style={styles.identity}><DeviceThumbnail device={device} /><View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name}>{device.name}</Text><Text selectable style={styles.id}>{device.devEui || device.hardwareId}</Text>
          {!!device.clusterName && <Text style={styles.cluster}>{device.clusterName}</Text>}
        </View><MaterialCommunityIcons name="chevron-right" size={22} color="#83AF23" /></View>
        <View style={styles.readings}>{deviceSummaryFields(device).map(field => {
          const palette = outputColors[field.tone || 'neutral'];
          return <View key={field.id} style={[styles.reading, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <MaterialCommunityIcons name={field.icon} size={24} color={palette.foreground} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.outputLabel}>Main output: {field.name}</Text>
              {field.switchState ? <View style={[styles.stateBadge, { backgroundColor: palette.foreground }]}>
                <MaterialCommunityIcons name="power" size={16} color="white" />
                <Text style={styles.stateText}>{field.switchState}</Text>
              </View> : <Text style={[styles.readingText, { color: palette.foreground }]}>{field.value}</Text>}
              {!!field.switchState && field.value.trim().toLowerCase() !== field.switchState.toLowerCase() && <Text style={styles.outputDescription}>{field.value}</Text>}
              {!!field.label && field.label !== field.value && field.label.trim().toLowerCase() !== field.switchState?.toLowerCase() && <Text style={[styles.outputDescription, { color: palette.foreground }]}>{field.label}</Text>}
            </View>
          </View>;
        })}
          {!deviceSummaryFields(device).length && <Text style={liveStyles.caption}>{device.mainOutputId ? 'Main output not reported' : 'No main output configured'}</Text>}
        </View>
        <Text style={styles.lastHeard}>Last heard · {device.lastHeard}{device.deleted ? ' · Archived' : ''}</Text>
      </Pressable></View>}
      ListEmptyComponent={<Feedback title={filter === 'archived' ? 'No archived devices' : 'No devices found'} message={query || filter !== 'current' ? 'Try another search or filter.' : 'This project has no devices to display.'} />} />
  </View>;
}
const outputColors = {
  red: { foreground: '#A52A24', background: '#FFF1F0', border: '#F2BCB8' },
  green: { foreground: '#256B38', background: '#EDF8EF', border: '#BADFC3' },
  yellow: { foreground: '#805A00', background: '#FFF8E5', border: '#EAD799' },
  neutral: { foreground: '#425365', background: '#F3F6F8', border: '#DCE3E9' },
};
const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, paddingLeft: 16, paddingRight: 4, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  search: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 15, color: '#303030' }, clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 12 },
  chip: { paddingHorizontal: 11, minHeight: 44, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#E6E6E6', backgroundColor: 'white' },
  selectedChip: { borderColor: '#83AF23', backgroundColor: '#F1F6E7' }, chipText: { color: '#858585', fontSize: 12 },
  count: { paddingHorizontal: 16, paddingVertical: 12, color: '#858585', fontSize: 11 }, list: { paddingHorizontal: 12, paddingBottom: 16, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { fontSize: 17, fontWeight: '600', color: '#303030', lineHeight: 23 },
  id: { fontSize: 11, color: '#858585', marginTop: 3 }, cluster: { fontSize: 11, color: '#AAAAAA', marginTop: 3 },
  readings: { marginTop: 17, gap: 8 }, reading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  outputLabel: { fontSize: 11, color: '#59636C', lineHeight: 16, marginBottom: 4 },
  stateBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stateText: { color: 'white', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  outputDescription: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  readingText: { fontSize: 20, fontWeight: '600', lineHeight: 28 }, lastHeard: { fontSize: 10, lineHeight: 16, color: '#AAAAAA', marginTop: 15 },
});
