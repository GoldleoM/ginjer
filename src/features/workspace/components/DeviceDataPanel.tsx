import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { ResponsiveGrid } from '../../../layout/responsive';
import type { OutputDefinition } from '../services/deviceInspection';
import { deviceDataFields, initialDataTab, type DataField, type DataTab } from '../services/deviceData';

export function DeviceDataPanel({ device, mainOutputId, definitions, loading = false }: { device: Device; mainOutputId?: string; definitions?: OutputDefinition[]; loading?: boolean }) {
  const [selectedTab, setTab] = useState<DataTab | null>(null);
  const [showIds, setShowIds] = useState(false);
  const groups = deviceDataFields(device, definitions, mainOutputId);
  const tab = selectedTab || initialDataTab(groups);
  const fields = groups[tab];
  return <View style={styles.panel}>
    <View accessibilityRole="tablist" style={styles.tabs}>{(['status', 'configuration', 'attributes'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}>
      <Text style={[styles.tabText, tab === value && styles.activeTabText]}>{value === 'status' ? 'Status' : value === 'configuration' ? 'Configuration' : 'Attributes'}</Text>
      <Text style={[styles.count, tab === value && styles.activeTabText]}>{groups[value].length}</Text>
    </Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel={showIds ? 'Hide field IDs' : 'Show field IDs'} accessibilityState={{ expanded: showIds }} onPress={() => setShowIds(value => !value)} style={styles.detailsButton}>
        <MaterialCommunityIcons name="information-outline" size={18} color="#73962B" />
      </Pressable>
    </View>
    {fields.length ? <EqualHeightCards key={tab} fields={fields} showIds={showIds} /> : <View style={styles.empty}>{loading ? <ActivityIndicator color="#8BAE41" /> : <MaterialCommunityIcons name="database-outline" size={26} color="#A7B38E" />}<Text style={styles.label}>{loading ? 'Loading device fields...' : tab === 'attributes' ? 'No attributes are available.' : 'No ' + (tab === 'configuration' ? 'configuration' : 'status') + ' fields are available.'}</Text></View>}
  </View>;
}
// Measure only the natural content, not the equalized outer card. This lets
// every card grow AND shrink when values, field IDs, text size, or width change.
function EqualHeightCards({ fields, showIds }: { fields: DataField[]; showIds: boolean }) {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const tallest = Math.max(104, ...fields.map(field => heights[field.id] || 0));
  return <ResponsiveGrid minimumWidth={130} maximumColumns={6} gap={12}>{fields.map(field =>
    <View key={field.id} style={[styles.card, field.main && styles.mainCard, { minHeight: tallest }]}>
      <View onLayout={event => {
        const height = Math.ceil(event.nativeEvent.layout.height) + 26; // Vertical padding + borders.
        setHeights(previous => previous[field.id] === height ? previous : { ...previous, [field.id]: height });
      }}>
      <View style={styles.cardHeader}><Text style={styles.name}>{field.name}</Text><View style={styles.readingIcon}><View style={[StyleSheet.absoluteFillObject, { borderRadius: 15, backgroundColor: field.color || '#8BAE41', opacity: 0.12 }]} /><MaterialCommunityIcons name={field.icon} size={18} color={field.color || '#8BAE41'} /></View></View>
      <Text selectable style={[styles.value, field.color ? { color: field.color } : undefined]}>{field.value || 'Not reported'}</Text>
      {!!field.label && field.label !== field.value && <Text style={styles.label}>{field.label}</Text>}
      {showIds && <Text selectable style={styles.fieldId}>ID: {field.id}</Text>}
      </View>
    </View>)}</ResponsiveGrid>;
}
const styles = StyleSheet.create({
  panel: { marginTop: 12, gap: 12 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: '#202523', fontSize: 16, fontWeight: '600' }, detailsButton: { minHeight: 44, minWidth: 32, alignItems: 'center', justifyContent: 'center' }, detailsText: { color: '#73962B', fontSize: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', maxWidth: '100%', padding: 4, gap: 4, backgroundColor: '#F1F1F1', borderRadius: 10 },
  tab: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 7 },
  activeTab: { backgroundColor: 'white' }, tabText: { color: '#858585', fontSize: 12, fontWeight: '500' }, activeTabText: { color: '#303830' }, count: { fontSize: 11, color: '#999999' },
  card: { minHeight: 104, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', padding: 12 },
  mainCard: { borderColor: '#C8DCA4', shadowColor: '#75923D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 1 },
  readingIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, name: { flex: 1, minWidth: 0, color: '#303030', fontSize: 12, fontWeight: '600', lineHeight: 21 },
  value: { marginTop: 12, marginBottom: 4, fontSize: 18, lineHeight: 25, color: '#303830', fontWeight: '600', flexShrink: 1 }, label: { fontSize: 12, lineHeight: 20, color: '#858B80' },
  badge: { flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, backgroundColor: '#EDF3E2', paddingHorizontal: 8, paddingVertical: 4, marginTop: 10 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8BAE41' }, badgeText: { color: '#6D8D30', fontSize: 10 },
  fieldId: { color: '#8A9084', fontSize: 10, lineHeight: 16, marginTop: 12 }, empty: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
});
