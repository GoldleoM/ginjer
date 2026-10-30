import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { ResponsiveGrid } from '../../../layout/responsive';
import type { OutputDefinition } from '../services/deviceInspection';
import { deviceDataFields, initialDataTab, type DataTab } from '../services/deviceData';

export function DeviceDataPanel({ device, mainOutputId, definitions, loading = false }: { device: Device; mainOutputId?: string; definitions?: OutputDefinition[]; loading?: boolean }) {
  const [selectedTab, setTab] = useState<DataTab | null>(null);
  const [showIds, setShowIds] = useState(false);
  const groups = deviceDataFields(device, definitions, mainOutputId);
  const tab = selectedTab || initialDataTab(groups);
  const fields = groups[tab];
  return <View style={styles.panel}>
    <View style={styles.headingRow}><Text accessibilityRole="header" style={styles.heading}>Device Data</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showIds }} onPress={() => setShowIds(value => !value)} style={styles.detailsButton}>
        <MaterialCommunityIcons name={showIds ? 'code-braces' : 'information-outline'} size={18} color="#73962B" /><Text style={styles.detailsText}>{showIds ? 'Hide field IDs' : 'Show field IDs'}</Text>
      </Pressable>
    </View>
    <View accessibilityRole="tablist" style={styles.tabs}>{(['status', 'configuration', 'attributes'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}>
      <Text style={[styles.tabText, tab === value && styles.activeTabText]}>{value === 'status' ? 'Status' : value === 'configuration' ? 'Configuration' : 'Attributes'}</Text>
      <Text style={[styles.count, tab === value && styles.activeTabText]}>{groups[value].length}</Text>
    </Pressable>)}</View>
    {fields.length ? <ResponsiveGrid minimumWidth={220} maximumColumns={4} gap={14}>{fields.map(field => <View key={field.id} style={styles.card}>
      <View style={styles.cardHeader}><Text style={styles.name}>{field.name}</Text><MaterialCommunityIcons name={field.icon} size={21} color={field.color || '#8DA65B'} /></View>
      <Text selectable style={[styles.value, field.color ? { color: field.color } : undefined]}>{field.value || 'Not reported'}</Text>
      {!!field.label && field.label !== field.value && <Text style={styles.label}>{field.label}</Text>}
      {field.main && <View style={styles.badge}><View style={styles.dot} /><Text style={styles.badgeText}>Main output</Text></View>}
      {showIds && <Text selectable style={styles.fieldId}>ID: {field.id}</Text>}
    </View>)}</ResponsiveGrid> : <View style={styles.empty}>{loading ? <ActivityIndicator color="#83AF23" /> : <MaterialCommunityIcons name="database-outline" size={26} color="#A7B38E" />}<Text style={styles.label}>{loading ? 'Loading device fields...' : tab === 'attributes' ? 'No attributes are available.' : 'No ' + (tab === 'configuration' ? 'configuration' : 'status') + ' fields are available.'}</Text></View>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { marginTop: 24, backgroundColor: 'white', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F0F0F0', gap: 20 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: '#202523', fontSize: 20, fontWeight: '600' }, detailsButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, detailsText: { color: '#73962B', fontSize: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', maxWidth: '100%', padding: 4, gap: 4, backgroundColor: '#F1F1F1', borderRadius: 10 },
  tab: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 7 },
  activeTab: { backgroundColor: 'white' }, tabText: { color: '#858585', fontSize: 14, fontWeight: '500' }, activeTabText: { color: '#303830' }, count: { fontSize: 11, color: '#999999' },
  card: { minHeight: 150, height: '100%', borderRadius: 15, borderWidth: 1.5, borderColor: '#C9DAA8', backgroundColor: '#FAFBF8', padding: 16, shadowColor: '#526B2F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, name: { flex: 1, minWidth: 0, color: '#747872', fontSize: 14, fontWeight: '600', lineHeight: 21 },
  value: { marginTop: 22, marginBottom: 6, fontSize: 25, lineHeight: 34, color: '#303830', fontWeight: '600', flexShrink: 1 }, label: { fontSize: 12, lineHeight: 20, color: '#858B80' },
  badge: { flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start', borderRadius: 12, backgroundColor: '#EDF3E2', paddingHorizontal: 8, paddingVertical: 4, marginTop: 10 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#83AF23' }, badgeText: { color: '#6D8D30', fontSize: 10 },
  fieldId: { color: '#8A9084', fontSize: 10, lineHeight: 16, marginTop: 12 }, empty: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
});
