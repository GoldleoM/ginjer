import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useResponsiveColumns, useResponsiveLayout } from '../../../layout/responsive';
import type { Device } from '../../devices/types';
import { LocationDeviceCard } from '../../locations/components/LocationDeviceCard';
import type { Workspace } from '../useWorkspace';
import { LiveMap } from '../components/LiveMap';
import { DeviceThumbnail, Feedback, liveStyles } from '../components/WorkspaceUI';

export function ConnectedLocations({ workspace, onDetails, onBackToDevices }: { workspace: Workspace; onDetails: (device: Device) => void; onBackToDevices: () => void }) {
  const { height } = useResponsiveLayout();
  const { columns, itemStyle, onLayout } = useResponsiveColumns();
  const [query, setQuery] = useState('');
  const [missing, setMissing] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [mapHeight, setMapHeight] = useState(0);
  const [cardHeight, setCardHeight] = useState(132);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedId) setSelectedId(''); else onBackToDevices();
      return true;
    });
    return () => subscription.remove();
  }, [selectedId, onBackToDevices]);
  const filtered = useMemo(() => workspace.devices.filter(device => !device.deleted && (device.name + ' ' + device.hardwareId).toLowerCase().includes(query.trim().toLowerCase())), [workspace.devices, query]);
  const mapped = filtered.filter(device => !!device.coordinates), unmapped = filtered.filter(device => !device.coordinates);
  const selected = mapped.find(device => device.id === selectedId);
  const controls = <>
    <View style={styles.searchBox}><MaterialCommunityIcons name="magnify" size={22} color="#858585" />
      <TextInput value={query} onChangeText={value => { setQuery(value); setSelectedId(''); }} placeholder="Search Devices" accessibilityLabel="Search device locations" autoCorrect={false} autoCapitalize="none"
        style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear location search" onPress={() => setQuery('')} style={styles.icon}><MaterialCommunityIcons name="close" size={22} color="#858585" /></Pressable>}
    </View>
    <View style={styles.filters}><Pressable accessibilityRole="button" accessibilityState={{ selected: !missing }} onPress={() => setMissing(false)} style={[styles.chip, !missing && styles.selectedChip]}><Text style={styles.filterText}>On map ? {mapped.length}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: missing }} onPress={() => setMissing(true)} style={[styles.chip, missing && styles.selectedChip]}><Text style={styles.filterText}>Without location ? {unmapped.length}</Text></Pressable></View>
  </>;
  return <View style={{ flex: 1, minHeight: 0 }} onLayout={onLayout}>
    {missing ? <FlatList key={columns} numColumns={columns} columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      ListHeaderComponent={<View style={{ marginHorizontal: -12 }}>{controls}</View>} data={unmapped} keyExtractor={device => device.id} contentContainerStyle={styles.list}
      renderItem={({ item }) => <View style={itemStyle}><Pressable accessibilityRole="button" onPress={() => onDetails(item)} style={[liveStyles.card, styles.deviceRow]}><DeviceThumbnail device={item} /><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>{item.name}</Text><Text style={liveStyles.caption}>{item.hardwareId}</Text><Text style={liveStyles.caption}>Coordinates not reported</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color="#83AF23" /></Pressable></View>}
      ListEmptyComponent={<Feedback title="No devices without locations" message={query ? 'Try another device name or ID.' : 'Every current device has reported valid coordinates.'} />} />
      : <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {controls}
        {mapped.length ? <View style={{ flex: 1, minHeight: Math.max(280, Math.min(height * 0.58, 640)) }} onLayout={event => setMapHeight(event.nativeEvent.layout.height)}>
          <LiveMap devices={mapped} selectedId={selectedId} onSelect={device => setSelectedId(current => current === device.id ? '' : device.id)} onBackground={() => setSelectedId('')} />
          {selected && <LocationDeviceCard device={selected} top={Math.max(12, mapHeight - cardHeight - 30)} maxHeight={Math.max(120, mapHeight - 24)} onLayout={setCardHeight} onDetails={() => onDetails(selected)} />}
        </View> : <Feedback title="No locations to display" message={unmapped.length ? 'These devices have not reported valid coordinates. Select Without location to view them.' : query ? 'Try another device name or ID.' : 'This project has no located devices.'} />}
      </ScrollView>}
  </View>;
}
const styles = StyleSheet.create({
  searchBox: { margin: 12, marginBottom: 8, paddingLeft: 14, paddingRight: 4, backgroundColor: 'white', borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  search: { flex: 1, minWidth: 0, minHeight: 50, color: '#303030', fontSize: 14 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  chip: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 20, backgroundColor: 'white' },
  selectedChip: { backgroundColor: '#F0F5E6', borderColor: '#83AF23' }, filterText: { color: '#6D941B', fontSize: 12 },
  list: { padding: 12, gap: 12 }, deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: '#303030', fontSize: 16, fontWeight: '600', marginBottom: 5 },
});
