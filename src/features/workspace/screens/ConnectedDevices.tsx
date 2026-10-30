import React, { useMemo, useState } from 'react';
import { theme } from '../../../theme';
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
  const { columns, itemStyle, onLayout } = useResponsiveColumns(140);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compact, setCompact] = useState(true);
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
    <View style={styles.searchBox}>
      <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search devices by name, ID, or cluster" placeholder="Search Devices" autoCapitalize="none" autoCorrect={false}
        style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
      <MaterialCommunityIcons name="magnify" size={21} color="#858585" />
      <Pressable accessibilityRole="button" accessibilityLabel={compact ? 'Show device grid' : 'Show device list'} onPress={() => setCompact(value => !value)} style={styles.clear}><MaterialCommunityIcons name={compact ? 'view-grid-outline' : 'view-list-outline'} size={22} color={theme.colors.primary} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Device filters and sorting" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(value => !value)} style={styles.clear}><MaterialCommunityIcons name="filter-variant" size={22} color={filtersOpen ? theme.colors.primary : '#858585'} /></Pressable>
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear device search" onPress={() => setQuery('')} style={styles.clear}><MaterialCommunityIcons name="close" size={22} color="#858585" /></Pressable>}
    </View>
    {filtersOpen && <><View style={[styles.filters, { marginBottom: 8 }]}>
      {([['name', 'Name'], ['newest', 'Newest heard'], ['oldest', 'Oldest heard']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="button" accessibilityLabel={'Sort devices by ' + label} accessibilityState={{ selected: sort === id }} onPress={() => setSort(id)} style={[styles.chip, sort === id && styles.selectedChip]}><Text style={styles.chipText}>{label}</Text></Pressable>)}
    </View>
    <View style={styles.filters}>{([['current', 'All devices'], ['recent', 'Last 24 hours'], ['attention', 'Red readings'], ['archived', 'Archived']] as const).map(([id, label]) =>
      <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: id === filter }} onPress={() => setFilter(id)}
        style={[styles.chip, id === filter && styles.selectedChip]}><Text style={[styles.chipText, id === filter && { color: '#6D941B' }]}>{label}</Text></Pressable>)}</View></>}
    <Text style={styles.count}>{devices.length} {devices.length === 1 ? 'device' : 'devices'}{workspace.updatedAt ? ' · Updated ' + formatTime(workspace.updatedAt) : ''}</Text>
      </View>} data={devices} keyExtractor={device => device.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={workspace.devicesLoading} onRefresh={workspace.refresh} tintColor="#8BAE41" />}
      renderItem={({ item: device }) => <View style={compact ? { width: '100%' } : itemStyle}><Pressable accessibilityRole="button" accessibilityLabel={device.name + ', ' + device.hardwareId + '. View details'}
        onPress={() => onSelect(device)} style={({ pressed }) => [liveStyles.card, !compact && styles.gridCard, pressed && { opacity: 0.7 }]}>
        <View style={[styles.identity, !compact && styles.gridIdentity]}><DeviceThumbnail device={device} /><View style={{ flex: 1, minWidth: 0, width: compact ? undefined : '100%' }}>
          <Text style={styles.name}>{device.name}</Text><Text selectable style={styles.id}>{device.devEui || device.hardwareId}</Text>
        </View><View style={[styles.activity, !compact && styles.gridActivity]}><Text style={styles.lastHeardLabel}>Last heard</Text><Text style={[styles.lastHeard, !compact && { textAlign: 'left' }]}>{device.lastHeard}</Text></View></View>
        <View style={styles.readings}>{deviceSummaryFields(device).map(field => {
          const palette = outputColors[field.tone || 'neutral'];
          return <View key={field.id} style={styles.reading}>
            <View style={[styles.readingIcon, { backgroundColor: palette.background }]}><MaterialCommunityIcons name={field.icon} size={16} color={palette.foreground} /></View>
            <Text style={styles.outputLabel}>{field.name}</Text>
            <Text style={[styles.readingText, { color: palette.foreground }]}>{field.switchState || field.value}</Text>
            {!!field.label && field.label !== field.value && field.label.toLowerCase() !== field.switchState?.toLowerCase() && <Text style={styles.outputDescription}>{field.label}</Text>}
          </View>;
        })}
          {!deviceSummaryFields(device).length && <Text style={styles.outputDescription}>{device.mainOutputId ? 'Main output not reported' : 'No main output configured'}</Text>}
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
        </View>
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
  gridCard: { flex: 1, padding: 12 }, gridIdentity: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }, gridActivity: { width: '100%', alignItems: 'flex-start' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, paddingLeft: 16, paddingRight: 4, backgroundColor: 'white', borderRadius: 8, ...theme.cardShadow },
  search: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 13, color: '#303030' }, clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 12 },
  chip: { paddingHorizontal: 11, minHeight: 44, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#E6E6E6', backgroundColor: 'white' },
  selectedChip: { borderColor: '#8BAE41', backgroundColor: '#F1F6E7' }, chipText: { color: '#858585', fontSize: 12 },
  count: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 8, color: '#858585', fontSize: 11 }, list: { paddingHorizontal: 12, paddingBottom: 16, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { fontSize: 15, fontWeight: '600', color: '#303030', lineHeight: 23 },
  id: { fontSize: 11, color: '#858585', marginTop: 3 }, cluster: { fontSize: 11, color: '#AAAAAA', marginTop: 3 },
  activity: { width: 78, alignItems: 'flex-end' }, lastHeardLabel: { fontSize: 10, color: '#AAAAAA' }, lastHeard: { fontSize: 10, lineHeight: 15, color: '#858585', textAlign: 'right', marginTop: 3 },
  readings: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, reading: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  readingIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  outputLabel: { fontSize: 11, color: '#858585' }, outputDescription: { fontSize: 11, lineHeight: 16, color: '#858585' }, readingText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
