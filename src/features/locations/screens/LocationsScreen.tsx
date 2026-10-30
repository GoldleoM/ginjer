import React, { useEffect, useMemo, useState } from 'react';
import { responsiveStyles } from '../../../layout/responsive';
import { ActivityIndicator, BackHandler, Image, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabs } from '../../../components/BottomTabs';
import { theme } from '../../../theme';
import { IconButton, PreviewDialog } from '../../devices/components/DeviceUI';
import { DeviceDetailsScreen } from '../../devices/screens/DeviceDetailsScreen';
import type { Device } from '../../devices/types';
import { DeviceMarker } from '../components/DeviceMarker';
import { LocationDeviceCard } from '../components/LocationDeviceCard';
import { filterLocations } from '../services/filterLocations';
import type { LocatedDevice, LocationFilter, LocationsRepository } from '../types';

const crop = { x: 300, y: 220, width: 400, height: 820 };
const filters: { id: LocationFilter; label: string }[] = [
  { id: 'all', label: 'All devices' }, { id: 'bins', label: 'Bin sensors' },
  { id: 'temperature', label: 'Temperature' }, { id: 'other', label: 'Other sensors' },
  { id: 'attention', label: 'Needs attention' },
];

export function LocationsScreen({ repository, onDevices, onAnalytics, onProfile }: {
  repository: LocationsRepository; onDevices: () => void; onAnalytics: () => void; onProfile: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<LocatedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LocationFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Device | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cardHeight, setCardHeight] = useState(132);
  const [toolbarHeight, setToolbarHeight] = useState(60);
  const visible = useMemo(() => filterLocations(devices, query, filter), [devices, query, filter]);
  const selected = visible.find(item => item.id === selectedId);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    repository.listDevices().then(value => { if (active) setDevices(value); })
      .catch(() => { if (active) setError('Unable to load device locations. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository, retry]);
  useEffect(() => {
    if (selectedId && !visible.some(item => item.id === selectedId)) setSelectedId(null);
  }, [selectedId, visible]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detail) setDetail(null);
      else if (filtersOpen) setFiltersOpen(false);
      else if (selectedId) setSelectedId(null);
      else onDevices();
      return true;
    });
    return () => subscription.remove();
  }, [detail, filtersOpen, selectedId, onDevices]);

  if (detail) return <DeviceDetailsScreen device={detail} onBack={() => setDetail(null)} />;

  // Fit the reference map region and transform image + markers together.
  const scale = Math.min(viewport.width / crop.width, viewport.height / crop.height);
  const offsetX = (viewport.width - crop.width * scale) / 2;
  const offsetY = (viewport.height - crop.height * scale) / 2;
  const headerTop = insets.top + 12;
  const markerY = selected ? offsetY + selected.point.y * crop.height * scale : 0;
  const preferredTop = markerY + cardHeight + 32 < viewport.height ? markerY + 24 : markerY - cardHeight - 26;
  const cardTop = Math.max(headerTop + toolbarHeight + 16, Math.min(preferredTop, viewport.height - cardHeight - 12));
  function closeOverlays() {
    Keyboard.dismiss();
    setSelectedId(null);
    setFiltersOpen(false);
  }
  function reset() { setQuery(''); setFilter('all'); setFiltersOpen(false); setSelectedId(null); }

  return <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
    <View style={styles.shell}>
      <View style={styles.map} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        {scale > 0 && <Image source={require('../../../../assets/images/locations/india-map.png')}
          accessibilityLabel="Static India map with sample device positions"
          style={{ position: 'absolute', width: 1132 * scale, height: 1314 * scale, left: offsetX - crop.x * scale, top: offsetY - crop.y * scale }} />}
        <Pressable accessible={!!selected} focusable={!!selected} accessibilityRole="button" accessibilityLabel="Close device information"
          onPress={closeOverlays} style={StyleSheet.absoluteFill} />
        {!loading && !error && scale > 0 && visible.map(item => <DeviceMarker key={item.id} item={item}
          x={offsetX + item.point.x * crop.width * scale} y={offsetY + item.point.y * crop.height * scale}
          selected={item.id === selectedId} onPress={() => {
            Keyboard.dismiss(); setFiltersOpen(false); setSelectedId(value => value === item.id ? null : item.id);
          }} />)}
        {selected && !filtersOpen && <LocationDeviceCard device={selected.device} top={cardTop} maxHeight={Math.max(100, viewport.height - headerTop - toolbarHeight - 36)}
          onLayout={height => setCardHeight(previous => previous === height ? previous : height)} onDetails={() => setDetail(selected.device)} />}
        <View style={[styles.searchBar, { top: headerTop }]} onLayout={event => setToolbarHeight(event.nativeEvent.layout.height)}>
          <TextInput accessibilityLabel="Search devices by name or ID" value={query} onChangeText={setQuery}
            placeholder="Search Devices" placeholderTextColor="#AAAAAA" autoCapitalize="none" autoCorrect={false} returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss} onFocus={() => { setSelectedId(null); setFiltersOpen(false); }}
            style={[styles.search, Platform.OS === 'web' && styles.webInput]} />
          {query ? <IconButton icon="close" label="Clear device search" onPress={() => setQuery('')} /> : <MaterialCommunityIcons name="magnify" size={24} color="#858585" />}
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" accessibilityLabel="Filter map devices" accessibilityState={{ expanded: filtersOpen }}
            onPress={() => { Keyboard.dismiss(); setSelectedId(null); setFiltersOpen(value => !value); }} style={styles.iconButton}>
            <MaterialCommunityIcons name="filter-variant" size={25} color={filter === 'all' ? '#858585' : theme.colors.primary} />
          </Pressable>
          <IconButton icon="bell" label="Notifications preview" onPress={() => { Keyboard.dismiss(); setFiltersOpen(false); setNotificationsOpen(true); }} />
        </View>
        {filtersOpen && <>
          <Pressable accessibilityRole="button" accessibilityLabel="Close map filters" onPress={() => setFiltersOpen(false)} style={styles.filterBackdrop} />
          <View accessibilityRole="menu" style={[styles.filterMenu, { top: headerTop + toolbarHeight + 10, maxHeight: Math.max(80, viewport.height - headerTop - toolbarHeight - 24) }]}><ScrollView>
            <Text accessibilityRole="header" style={styles.filterTitle}>Show devices</Text>
            {filters.map(option => <Pressable key={option.id} accessibilityRole="menuitem" accessibilityState={{ selected: option.id === filter }}
              onPress={() => { setFilter(option.id); setFiltersOpen(false); }} style={[styles.filterOption, option.id === filter && styles.selectedFilter]}>
              <Text style={styles.filterText}>{option.label}</Text>{option.id === filter && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
            </Pressable>)}
          </ScrollView></View>
        </>}
        {filter !== 'all' && !filtersOpen && !loading && !error && visible.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear map filter" onPress={() => setFilter('all')}
          style={[styles.filterBadge, { top: headerTop + toolbarHeight + 12 }]}><Text style={styles.filterBadgeText}>{filters.find(option => option.id === filter)?.label}</Text><MaterialCommunityIcons name="close" size={16} color="#6D941B" /></Pressable>}
        {(loading || !!error || !visible.length) && <View style={[styles.feedback, { top: headerTop + toolbarHeight + 20, maxHeight: Math.max(40, viewport.height - headerTop - toolbarHeight - 32) }]}><ScrollView contentContainerStyle={styles.feedbackContent}>
          {loading ? <ActivityIndicator accessibilityLabel="Loading device locations" color={theme.colors.primary} />
            : error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable></>
              : <><Text style={styles.emptyTitle}>No devices found</Text><Text style={styles.emptyText}>{devices.length ? 'Try another name, ID, or filter.' : 'There are no sample devices to display.'}</Text>
                {!!devices.length && <Pressable accessibilityRole="button" onPress={reset} style={styles.action}><Text style={styles.actionText}>Clear search and filters</Text></Pressable>}</>}
        </ScrollView></View>}
      </View>
      <BottomTabs active="Locations" onDevices={onDevices} onLocations={closeOverlays} onAnalytics={onAnalytics} onProfile={onProfile} />
    </View>
    <PreviewDialog visible={notificationsOpen} title="Notifications preview" onClose={() => setNotificationsOpen(false)}>
      <Text style={styles.notificationText}>There are no notifications in this sample workspace.</Text>
    </PreviewDialog>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'white' },
  shell: responsiveStyles.shell,
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#ACE3DD' },
  searchBar: { position: 'absolute', left: 12, right: 12, minHeight: 60, borderRadius: 9, backgroundColor: 'white', paddingLeft: 16, paddingRight: 3,
    flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 7, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  search: { flex: 1, minWidth: 0, fontSize: 14, color: '#303030', paddingVertical: 18 },
  webInput: { borderWidth: 0, outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent', boxShadow: 'none' },
  divider: { width: 1, height: 26, backgroundColor: '#AAAAAA', marginHorizontal: 2 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  filterMenu: { position: 'absolute', left: 12, right: 12, maxWidth: 520, zIndex: 6, backgroundColor: 'white', borderRadius: 9, overflow: 'hidden',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 7 },
  filterTitle: { color: '#858585', fontSize: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  filterOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  selectedFilter: { backgroundColor: '#F2F6E9' },
  filterText: { fontSize: 14, color: '#303030' },
  filterBadge: { position: 'absolute', left: 14, zIndex: 4, backgroundColor: 'white', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 36 },
  filterBadgeText: { color: '#6D941B', fontSize: 12 },
  feedback: { position: 'absolute', left: 24, right: 24, borderRadius: 12, backgroundColor: '#FFFFFFF2' },
  feedbackContent: { padding: 20, alignItems: 'center', gap: 12 },
  error: { color: theme.colors.error, textAlign: 'center', lineHeight: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#303030' },
  emptyText: { color: '#858585', textAlign: 'center', lineHeight: 21 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  actionText: { color: '#6D941B', fontWeight: '600' },
  notificationText: { color: '#858585', fontSize: 15, lineHeight: 23 },
});
