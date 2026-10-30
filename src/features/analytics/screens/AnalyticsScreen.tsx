import React, { useEffect, useState } from 'react';
import { ResponsiveGrid, responsiveStyles } from '../../../layout/responsive';
import { ActivityIndicator, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs } from '../../../components/BottomTabs';
import { theme } from '../../../theme';
import { formatMetricTime, MetricCard } from '../components/MetricCard';
import type { AnalyticsDashboard, AnalyticsMetric, AnalyticsRepository, DashboardOption } from '../types';

export function AnalyticsScreen({ repository, dashboardId, onDashboardChange, onDevices, onProfile, onLocations }: {
  repository: AnalyticsRepository; dashboardId: string; onDashboardChange: (id: string) => void;
  onDevices: () => void; onLocations: () => void; onProfile: () => void;
}) {
  const [options, setOptions] = useState<DashboardOption[]>([]);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [info, setInfo] = useState<AnalyticsMetric | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setDashboard(null);
    setError('');
    Promise.all([repository.listDashboards(), repository.loadDashboard(dashboardId)])
      .then(([available, value]) => { if (active) { setOptions(available); setDashboard(value); } })
      .catch(() => { if (active) setError('Unable to load this dashboard. Please try again.'); });
    return () => { active = false; };
  }, [repository, dashboardId, retry]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expanded) setExpanded(false);
      else onDevices();
      return true;
    });
    return () => subscription.remove();
  }, [expanded, onDevices]);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.shell}>
      <View style={styles.dashboardHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Select analytics dashboard" accessibilityState={{ expanded, disabled: !options.length }}
          disabled={!options.length} onPress={() => setExpanded(value => !value)}
          style={({ pressed }) => [styles.selector, pressed && { opacity: 0.75 }]}>
          <Text style={styles.selectorText}>{options.find(item => item.id === dashboardId)?.name ?? 'Public Dashboard'}</Text>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={theme.colors.primary} />
        </Pressable>
      </View>
      {expanded && <View accessibilityRole="menu" style={styles.dropdown}>
        {options.map(option => <Pressable key={option.id} accessibilityRole="menuitem"
          accessibilityState={{ selected: dashboardId === option.id }}
          onPress={() => { setExpanded(false); setInfo(null); onDashboardChange(option.id); }}
          style={({ pressed }) => [styles.option, option.id === dashboardId && styles.selectedOption, pressed && { opacity: 0.7 }]}>
          <Text style={styles.selectorText}>{option.name}</Text>
          {option.id === dashboardId && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
        </Pressable>)}
      </View>}
      <ScrollView contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
        {error ? <View style={styles.feedback}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View> : dashboard?.id !== dashboardId ? <View style={styles.feedback}><ActivityIndicator accessibilityLabel="Loading dashboard" color={theme.colors.primary} /></View>
          : dashboard.metrics.length ? <ResponsiveGrid>{dashboard.metrics.map(metric => <MetricCard key={metric.id} metric={metric} onInfo={() => setInfo(metric)} />)}</ResponsiveGrid>
            : <View style={styles.feedback}><MaterialCommunityIcons name="chart-box-outline" size={38} color="#AAAAAA" /><Text style={styles.emptyTitle}>No readings yet</Text><Text style={styles.emptyText}>This dashboard has no metrics to display.</Text></View>}
      </ScrollView>
      <BottomTabs active="Analytics" onLocations={onLocations} onDevices={onDevices} onAnalytics={() => setExpanded(false)} onProfile={onProfile} />
      {expanded && <Pressable accessibilityRole="button" accessibilityLabel="Close dashboard selector" onPress={() => setExpanded(false)} style={styles.dropdownBackdrop} />}
    </View>
    <Modal visible={info !== null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
      <SafeAreaView style={styles.modalBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close metric information" onPress={() => setInfo(null)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.dialog}><ScrollView>
          <View style={styles.dialogHeader}><Text accessibilityRole="header" style={styles.dialogTitle}>{info?.title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close metric information" onPress={() => setInfo(null)} style={styles.close}><MaterialCommunityIcons name="close" size={24} color="#303030" /></Pressable>
          </View>
          <Text style={styles.sample}>Sample reading</Text>
          <Text style={styles.description}>{info?.description}</Text>
          <Text selectable style={styles.detail}>Device: {info?.deviceId}</Text>
          <Text style={styles.detail}>Recorded: {info ? formatMetricTime(info.recordedAt) : ''} IST</Text>
        </ScrollView></View>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  shell: responsiveStyles.shell,
  dashboardHeader: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 16, zIndex: 3 },
  selector: { minHeight: 44, paddingHorizontal: 16, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E8EEDC', flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  selectorText: { flex: 1, color: '#252525', fontSize: 14, lineHeight: 20 },
  dropdown: { position: 'absolute', top: 66, left: 14, right: 14, zIndex: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: 'white', borderWidth: 1, borderColor: '#E8EEDC',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  selectedOption: { backgroundColor: '#F2F6E9' },
  dropdownBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  cards: { paddingHorizontal: 12, paddingBottom: 16, gap: 14 },
  feedback: { minHeight: 240, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  error: { color: theme.colors.error, textAlign: 'center', lineHeight: 22 },
  retry: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center' },
  retryText: { color: '#6D941B', fontWeight: '600' },
  emptyTitle: { color: '#303030', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#858585', textAlign: 'center', lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 520, maxHeight: '100%', backgroundColor: 'white', padding: 20, borderRadius: 16 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialogTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#303030' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sample: { color: '#6D941B', fontSize: 12, marginTop: 8, marginBottom: 12 },
  description: { color: '#666666', fontSize: 15, lineHeight: 23, marginBottom: 16 },
  detail: { color: '#858585', fontSize: 12, lineHeight: 21 },
});
