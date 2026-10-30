import React, { useMemo, useState } from 'react';
import { useResponsiveColumns } from '../../../layout/responsive';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Workspace } from '../useWorkspace';
import { Feedback, liveStyles } from '../components/WorkspaceUI';
type Metric = { id: string; name: string; value: string; label?: string; color?: string; device: Device };

export function ConnectedAnalytics({ workspace, onSelect, onModules }: { workspace: Workspace; onSelect: (device: Device) => void; onModules: () => void }) {
  const [kind, setKind] = useState<'outputs' | 'attributes'>('outputs');
  const { columns, itemStyle, onLayout } = useResponsiveColumns();
  const [query, setQuery] = useState('');
  const metrics = useMemo(() => {
    const items: Metric[] = workspace.devices.filter(device => !device.deleted).flatMap(device => kind === 'outputs'
      ? device.readings.map(reading => ({ id: device.id + ':' + reading.id, name: reading.title, value: reading.value, label: reading.label, color: reading.color, device }))
      : (device.attributes ?? []).map(attribute => ({ id: device.id + ':' + attribute.id, name: attribute.name, value: attribute.value, device })));
    return items.filter(item => (item.name + ' ' + item.value + ' ' + item.device.name + ' ' + item.device.hardwareId).toLowerCase().includes(query.trim().toLowerCase()));
  }, [workspace.devices, query, kind]);
  return <View style={{ flex: 1, minHeight: 0 }} onLayout={onLayout}>
    <FlatList key={columns} numColumns={columns} columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      ListHeaderComponent={<View style={{ marginHorizontal: -12 }}>
    <View style={styles.header}><Text accessibilityRole="header" style={liveStyles.heading}>Analytics</Text>
      <Pressable accessibilityRole="button" onPress={onModules} style={styles.modules}><MaterialCommunityIcons name="view-grid-outline" size={18} color="#6D941B" /><Text style={styles.moduleText}>Modules</Text></Pressable>
    </View>
    <Text style={styles.caption}>Latest reported values · {metrics.length} {kind}</Text>
    <View style={styles.switcher}>{(['outputs', 'attributes'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: kind === value }}
      onPress={() => setKind(value)} style={[styles.tab, kind === value && styles.activeTab]}><Text style={{ color: kind === value ? '#6D941B' : '#858585', fontWeight: '500' }}>{value === 'outputs' ? 'Outputs' : 'Attributes'}</Text></Pressable>)}</View>
    <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search readings and devices" placeholder="Search readings or devices" autoCorrect={false}
      style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
      </View>} data={metrics} keyExtractor={item => item.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={workspace.devicesLoading} onRefresh={workspace.refresh} tintColor="#83AF23" />}
      renderItem={({ item }) => <View style={itemStyle}><View style={liveStyles.card}>
        <Text style={styles.title}>{item.name}</Text><Text style={styles.deviceName}>{item.device.name}</Text>
        <Text selectable style={[styles.value, item.color && { color: item.color }]}>{item.value}</Text>
        {!!item.label && item.label !== item.value && <Text style={liveStyles.caption}>{item.label}</Text>}
        <View style={styles.footer}><View style={{ flex: 1, gap: 5 }}><Text selectable style={styles.metadata}>{item.device.hardwareId}</Text><Text style={styles.metadata}>{item.device.lastHeard}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={'View device for ' + item.name} onPress={() => onSelect(item.device)} style={styles.info}><MaterialCommunityIcons name="information-outline" size={23} color="#858585" /></Pressable>
        </View>
      </View></View>} ListEmptyComponent={<Feedback title={'No ' + kind + ' found'} message={query ? 'Try another reading or device name.' : 'No ' + kind + ' have been reported for the devices in this project.'} />} />
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  modules: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, moduleText: { color: '#6D941B', fontSize: 13 },
  caption: { color: '#858585', fontSize: 12, paddingHorizontal: 16, marginBottom: 12 },
  switcher: { flexDirection: 'row', marginHorizontal: 12, backgroundColor: '#EBEBEB', borderRadius: 9, padding: 3 },
  tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, activeTab: { backgroundColor: 'white' },
  search: { minHeight: 46, backgroundColor: 'white', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 9, margin: 12, paddingHorizontal: 13, color: '#303030', fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 16, gap: 12 }, title: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#303030' },
  deviceName: { fontSize: 12, color: '#858585', marginTop: 4 }, value: { color: '#303030', fontSize: 25, fontWeight: '600', lineHeight: 34, marginVertical: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 12 }, metadata: { fontSize: 10, lineHeight: 15, color: '#AAAAAA' },
  info: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
