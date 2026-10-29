import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, IconButton, PreviewDialog, ReadingIcon } from '../components/DeviceUI';
import { demoDevices } from '../data/demoDevices';
import type { Device, DeviceIcon } from '../types';

type Filter = 'all' | 'recent' | 'attention';
export function DeviceListScreen({ onSelect, onExit, preview }: { onSelect: (device: Device) => void; onExit: () => void; preview: boolean }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialog, setDialog] = useState<'notifications' | 'profile' | null>(null);
  const devices = useMemo(() => demoDevices.filter(device =>
    (device.name.toLowerCase().includes(query.trim().toLowerCase()) || device.hardwareId.toLowerCase().includes(query.trim().toLowerCase())) &&
    (filter === 'all' || (filter === 'recent' ? device.recent : device.needsAttention))
  ), [query, filter]);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.shell}>
      <View style={styles.preview}><Text style={styles.previewText}>Sample devices</Text><Pressable accessibilityRole="button" onPress={onExit} hitSlop={10}><Text style={styles.exit}>{preview ? 'Exit preview' : 'Sign out'}</Text></Pressable></View>
      <View style={styles.searchBar}>
        <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search Devices" placeholderTextColor={colors.light} accessibilityLabel="Search devices by name or ID" returnKeyType="search" autoCorrect={false} />
        {query ? <IconButton icon="close" label="Clear search" onPress={() => setQuery('')} /> : <MaterialCommunityIcons name="magnify" size={26} color={colors.muted} />}
        <View style={styles.divider} />
        <IconButton icon="filter-variant" label="Toggle device filters" onPress={() => setFiltersOpen(!filtersOpen)} color={filter !== 'all' ? colors.green : colors.muted} />
        <IconButton icon="bell" label="Notifications preview" onPress={() => setDialog('notifications')} />
      </View>
      {filtersOpen && <View style={styles.filters}>{([['all', 'All devices'], ['recent', 'Recent'], ['attention', 'Needs attention']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.chip, filter === value && styles.activeChip]}><Text style={[styles.chipText, filter === value && { color: colors.green }]}>{label}</Text></Pressable>)}</View>}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {devices.map(device => <Pressable key={device.id} accessibilityRole="button" accessibilityLabel={`${device.name}, ${device.hardwareId}. View device details`} onPress={() => onSelect(device)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
          <View style={styles.cardHeader}>
            <View style={styles.thumbnail}><Image source={device.image} style={styles.deviceImage} resizeMode="contain" /></View>
            <View style={styles.identity}><Text style={styles.name}>{device.name}</Text><Text style={styles.hardwareId}>{device.hardwareId}</Text></View>
            <View style={styles.lastHeard}><Text style={styles.lastHeardLabel}>Last Heard</Text><Text style={styles.time}>{device.lastHeard}</Text></View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.readings}>{device.readings.slice(0, 2).map(reading => <View key={reading.id} style={styles.reading}><ReadingIcon icon={reading.icon} tone={reading.tone} /><Text style={styles.readingText}>{reading.summary}</Text></View>)}</View>
            <MaterialCommunityIcons name="arrow-down-thin" size={24} color={colors.green} />
          </View>
        </Pressable>)}
        {devices.length === 0 && <View style={styles.empty}><MaterialCommunityIcons name="magnify" size={36} color={colors.light} /><Text style={styles.emptyTitle}>No devices found</Text><Text style={styles.emptyText}>Try a different name, ID, or filter.</Text><Pressable accessibilityRole="button" onPress={() => { setQuery(''); setFilter('all'); }} style={styles.reset}><Text style={styles.exit}>Clear search and filters</Text></Pressable></View>}
      </ScrollView>
      <View style={styles.tabs}>
        {([{ label: 'Devices', icon: 'router-wireless' }, { label: 'Locations', icon: 'map-outline' }, { label: 'Analytics', icon: 'chart-bar' }, { label: 'Profile', icon: 'account-outline' }] as { label: string; icon: DeviceIcon }[]).map(tab => <Pressable key={tab.label} accessibilityRole="tab" accessibilityLabel={tab.label === 'Locations' || tab.label === 'Analytics' ? `${tab.label}, coming soon` : tab.label} accessibilityState={{ selected: tab.label === 'Devices', disabled: tab.label === 'Locations' || tab.label === 'Analytics' }} disabled={tab.label === 'Locations' || tab.label === 'Analytics'} onPress={() => { if (tab.label === 'Profile') setDialog('profile'); }} style={styles.tab}>
          <MaterialCommunityIcons name={tab.icon} size={25} color={tab.label === 'Devices' ? colors.green : colors.light} /><Text style={[styles.tabLabel, tab.label === 'Devices' && { color: colors.green }]}>{tab.label}</Text>
        </Pressable>)}
      </View>
    </View>
    <PreviewDialog visible={dialog !== null} title={dialog === 'profile' ? 'Device preview' : 'Notifications'} onClose={() => setDialog(null)}>
      <Text style={styles.dialogText}>{dialog === 'profile' ? 'These screens use sample devices from the supplied designs. Live device data will be connected in a later step.' : 'Live notifications are not connected in this page preview.'}</Text>
      {dialog === 'profile' && <Pressable accessibilityRole="button" style={styles.reset} onPress={onExit}><Text style={styles.exit}>{preview ? 'Return to sign in' : 'Sign out'}</Text></Pressable>}
    </PreviewDialog>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F2' }, shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  preview: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }, previewText: { color: colors.muted, fontSize: 12 }, exit: { color: '#6D941B', fontWeight: '600', fontSize: 13 },
  searchBar: { backgroundColor: 'white', marginHorizontal: 12, borderRadius: 10, minHeight: 58, paddingLeft: 16, paddingRight: 6, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 3, marginBottom: 16 },
  search: { flex: 1, minWidth: 0, fontSize: 16, color: colors.text, paddingVertical: 16 }, divider: { width: 1, height: 26, backgroundColor: '#999999', marginHorizontal: 6 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }, chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'white', borderWidth: 1, borderColor: '#E7E7E7' }, activeChip: { backgroundColor: '#EDF5E1', borderColor: colors.green }, chipText: { color: colors.muted, fontSize: 12 },
  list: { paddingHorizontal: 12, paddingBottom: 16, gap: 12 },
  card: { padding: 16, backgroundColor: 'white', borderRadius: 10, minHeight: 116, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, thumbnail: { width: 42, height: 44, borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden', justifyContent: 'center', backgroundColor: 'white' }, deviceImage: { width: '100%', height: '100%' },
  identity: { flex: 1, minWidth: 0, paddingTop: 4 }, name: { fontSize: 17, fontWeight: '600', color: colors.text }, hardwareId: { fontSize: 11, color: '#777777', marginTop: 3 },
  lastHeard: { alignItems: 'flex-end', maxWidth: '30%', paddingTop: 5, gap: 4 }, lastHeardLabel: { fontSize: 10, color: colors.light }, time: { fontSize: 10, color: '#777777', textAlign: 'right', lineHeight: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }, readings: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, flex: 1 }, reading: { flexDirection: 'row', alignItems: 'center', gap: 5 }, readingText: { color: colors.muted, fontSize: 11 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', paddingTop: 8, paddingBottom: 8 }, tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 }, tabLabel: { color: colors.light, fontSize: 12 },
  empty: { alignItems: 'center', padding: 32, gap: 12 }, emptyTitle: { fontSize: 18, color: colors.text, fontWeight: '600' }, emptyText: { textAlign: 'center', color: colors.muted }, reset: { paddingVertical: 14 }, dialogText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});
