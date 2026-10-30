import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import type { Operations } from '../useOperations';
import { notificationDevice, type AutomationRule, type Notification, type RunPage } from '../services/operations';
import { formatTime } from '../services/normalizers';
import { DetailRow, Feedback, InfoDialog, liveStyles } from '../components/WorkspaceUI';
import { ResponsiveGrid } from '../../../layout/responsive';

const human = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
export function NotificationBanner({ operations, devices, onDevice, onNotifications }: { operations: Operations; devices: Device[]; onDevice: (device: Device) => void; onNotifications: () => void }) {
  const [dismissed, setDismissed] = useState('');
  const active = operations.notifications.data.filter(item => item.status === 'ACTIVE');
  const latest = active[0];
  const key = operations.notifications.scope + ':' + latest?.id + ':' + latest?.count + ':' + active.length;
  if (!latest || operations.notifications.error || dismissed === key) return null;
  const device = notificationDevice(latest, devices, operations.scope);
  const title = operations.rules.data.find(item => item.id === latest.ruleId)?.name || 'Active notification';
  return <View accessibilityLiveRegion="polite" style={styles.banner}>
    <Pressable accessibilityRole="button" onPress={() => device ? onDevice(device) : onNotifications()} style={styles.bannerBody}><MaterialCommunityIcons name="bell-alert-outline" size={22} color="#94621B" /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={styles.bannerTitle}>{title}</Text><Text style={styles.caption}>{device?.name || 'Project notification'} / {active.length} active</Text></View></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={onNotifications} style={styles.icon}><MaterialCommunityIcons name="chevron-right" size={23} color="#94621B" /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification banner" onPress={() => setDismissed(key)} style={styles.icon}><MaterialCommunityIcons name="close" size={20} color="#94621B" /></Pressable>
  </View>;
}
export function ConnectedNotifications({ operations, devices, onDevice }: { operations: Operations; devices: Device[]; onDevice: (device: Device) => void }) {
  const [filter, setFilter] = useState<Notification['status'] | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const { notifications, rules } = operations;
  const name = (item: Notification) => rules.data.find(rule => rule.id === item.ruleId)?.name || 'Notification';
  const filtered = notifications.data.filter(item => (filter === 'ALL' || item.status === filter) && [name(item), notificationDevice(item, devices, operations.scope)?.name, ...item.values.map(value => value.label + ' ' + value.value)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <FlatList data={filtered.slice(0, limit)} keyExtractor={item => item.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={notifications.busy} onRefresh={operations.refresh} tintColor="#83AF23" />}
    ListHeaderComponent={<View style={styles.stack}><Text accessibilityRole="header" style={styles.title}>Notifications</Text><Text style={styles.caption}>Project alerts, newest first. Refreshes every minute while the app is active.</Text>
      <TextInput accessibilityLabel="Search notifications" value={query} onChangeText={value => { setQuery(value); setLimit(30); }} placeholder="Search notifications or devices" style={styles.search} autoCorrect={false} />
      <View style={styles.chips}>{(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'ARCHIVED'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => { setFilter(value); setLimit(30); }} style={[styles.chip, filter === value && styles.selected]}><Text style={styles.link}>{human(value)}</Text></Pressable>)}</View>
      {!!notifications.error && <Feedback title="Unable to refresh notifications" message={notifications.error + (notifications.data.length ? ' Showing the last loaded notifications.' : '')} onRetry={operations.refresh} />}
      {!!rules.error && <Text style={styles.caption}>Rule names could not be loaded. Notification details remain available.</Text>}
      <Text style={styles.caption}>{filtered.length} notifications</Text>
    </View>}
    renderItem={({ item }) => {
      const device = notificationDevice(item, devices, operations.scope);
      return <View style={liveStyles.card}><View style={styles.row}><Text style={[styles.badge, item.status === 'ACTIVE' && { color: '#94621B' }]}>{human(item.status)}</Text><Text style={styles.caption}>{formatTime(item.timestamp)}</Text></View>
        <Text style={styles.cardTitle}>{name(item)}</Text>{item.count > 1 && <Text style={styles.caption}>Triggered {item.count} times</Text>}
        {item.values.map((value, index) => <DetailRow key={index} label={device?.readings.find(reading => reading.id === value.outputId)?.title || value.label || 'Output'} value={value.value || value.label || 'Not reported'} />)}
        {device ? <Pressable accessibilityRole="button" onPress={() => onDevice(device)} style={styles.deviceLink}><Text style={styles.link}>{device.name}</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#6D941B" /></Pressable>
          : <Text style={styles.caption}>{item.deviceId ? 'The linked device is not available in this project.' : 'Project-level notification'}</Text>}
      </View>;
    }}
    ListEmptyComponent={notifications.busy && !notifications.data.length ? <Feedback busy /> : !notifications.error ? <Feedback title="No notifications" message={query || filter !== 'ALL' ? 'Try another search or status.' : 'No alerts have been returned for this project.'} /> : null}
    ListFooterComponent={limit < filtered.length ? <Pressable accessibilityRole="button" onPress={() => setLimit(value => value + 30)} style={styles.button}><Text style={styles.link}>Load more</Text></Pressable> : null} />;
}
function RuleRuns({ rule, operations, devices, onDevice }: { rule: AutomationRule; operations: Operations; devices: Device[]; onDevice: (device: Device) => void }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RunPage>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setBusy(true); setError(''); setData(undefined);
    operations.api.runs(operations.scope, rule.id, page, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load run history.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [operations.api, operations.scope, rule.id, page, revision]);
  return <View style={styles.stack}><Text style={styles.cardTitle}>Run history</Text>{busy ? <Feedback busy /> : error ? <Feedback title="Run history unavailable" message={error} onRetry={() => setRevision(value => value + 1)} /> : <>
    {data?.runs.length ? data.runs.map(run => {
      const device = devices.find(item => item.id === run.deviceId && item.organizationId === operations.scope.organisationId && item.projectId === operations.scope.projectId);
      return <View key={run.id} style={styles.run}><Text style={styles.badge}>{human(run.state)}</Text><DetailRow label="Started" value={formatTime(run.startedAt)} /><DetailRow label="Trigger" value={human(run.trigger)} /><DetailRow label="Current step" value={run.currentStep} /><DetailRow label="Finished" value={run.finishedAt ? formatTime(run.finishedAt) : undefined} /><DetailRow label="Reason" value={human(run.abortReason || run.cancelReason)} />
        {!!run.skipped && <DetailRow label="Skipped triggers" value={run.skipped} />}{device && <Pressable accessibilityRole="button" onPress={() => onDevice(device)} style={styles.button}><Text style={styles.link}>{device.name}</Text></Pressable>}</View>;
    }) : <Text style={styles.caption}>No runs were returned for this rule.</Text>}
    <View style={styles.row}><Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage(value => value - 1)} style={[styles.button, page <= 1 && styles.disabled]}><Text style={styles.link}>Previous</Text></Pressable><Text style={styles.caption}>{data?.page || page} / {data?.pages || 1}</Text><Pressable accessibilityRole="button" disabled={page >= (data?.pages || 1)} onPress={() => setPage(value => value + 1)} style={[styles.button, page >= (data?.pages || 1) && styles.disabled]}><Text style={styles.link}>Next</Text></Pressable></View>
  </>}</View>;
}
export function ConnectedAutomation({ operations, devices, onDevice }: { operations: Operations; devices: Device[]; onDevice: (device: Device) => void }) {
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [limit, setLimit] = useState(30);
  const { rules } = operations;
  const selected = rules.data.find(rule => rule.id === selectedId);
  const filtered = rules.data.filter(rule => (!onlyActive || rule.active) && rule.name.toLowerCase().includes(query.toLowerCase().trim()));
  return <View style={{ flex: 1 }}><FlatList data={filtered.slice(0, limit)} keyExtractor={item => item.id} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={rules.busy} onRefresh={operations.refresh} tintColor="#83AF23" />}
    ListHeaderComponent={<View style={styles.stack}><Text accessibilityRole="header" style={styles.title}>Automation</Text><Text style={styles.caption}>Configured rules, target devices, and run history.</Text>
      <ResponsiveGrid minimumWidth={140} maximumColumns={3}>{[['Rules', rules.data.length], ['Enabled', rules.data.filter(rule => rule.active).length], ['Command steps', rules.data.reduce((sum, rule) => sum + rule.actions.length, 0)]].map(([label, value]) => <View key={label} style={liveStyles.card}><Text style={styles.metric}>{value}</Text><Text style={styles.caption}>{label}</Text></View>)}</ResponsiveGrid>
      <TextInput accessibilityLabel="Search automation rules" value={query} onChangeText={value => { setQuery(value); setLimit(30); }} placeholder="Search rules" autoCorrect={false} style={styles.search} />
      <View style={styles.chips}>{[false, true].map(value => <Pressable key={String(value)} accessibilityRole="button" accessibilityState={{ selected: onlyActive === value }} onPress={() => { setOnlyActive(value); setLimit(30); }} style={[styles.chip, onlyActive === value && styles.selected]}><Text style={styles.link}>{value ? 'Enabled' : 'All rules'}</Text></Pressable>)}</View>
      {!!rules.error && <Feedback title="Unable to refresh rules" message={rules.error + (rules.data.length ? ' Showing previously loaded rules.' : '')} onRetry={operations.refresh} />}
    </View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setSelectedId(item.id)} style={liveStyles.card}><View style={styles.row}><Text style={styles.badge}>{item.active ? 'Enabled' : 'Disabled'}</Text><MaterialCommunityIcons name="chevron-right" size={22} color="#83AF23" /></View><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.caption}>{item.triggers.map(human).join(', ') || 'Trigger not reported'}</Text><Text style={styles.caption}>{item.conditions.length} conditions / {item.actions.length} command steps / {item.deviceIds.length} linked devices</Text></Pressable>}
    ListEmptyComponent={rules.busy && !rules.data.length ? <Feedback busy /> : !rules.error ? <Feedback title="No rules found" message={query || onlyActive ? 'Try another search or filter.' : 'No automation or alert rules are configured for this project.'} /> : null}
    ListFooterComponent={limit < filtered.length ? <Pressable accessibilityRole="button" onPress={() => setLimit(value => value + 30)} style={styles.button}><Text style={styles.link}>Load more rules</Text></Pressable> : null} />
    <InfoDialog visible={!!selected} title={selected?.name || 'Rule'} onClose={() => setSelectedId('')}>
      {selected && <View style={styles.stack}><DetailRow label="Status" value={selected.active ? 'Enabled' : 'Disabled'} /><DetailRow label="Triggers" value={selected.triggers.map(human).join(', ')} /><DetailRow label="Schedule" value={selected.schedule} />
        <Text style={styles.cardTitle}>Conditions</Text>{selected.conditions.length ? selected.conditions.map((condition, i) => <DetailRow key={i} label={devices.flatMap(device => device.readings).find(reading => reading.id === condition.outputId)?.title || condition.outputId} value={human(condition.operator) + ' ' + condition.value} />) : <Text style={styles.caption}>No measurement conditions reported.</Text>}
        <Text style={styles.cardTitle}>Linked devices</Text>{selected.deviceIds.map(id => {
          const device = devices.find(item => item.id === id && item.organizationId === operations.scope.organisationId && item.projectId === operations.scope.projectId);
          return device ? <Pressable key={id} accessibilityRole="button" onPress={() => { setSelectedId(''); onDevice(device); }} style={styles.button}><Text style={styles.link}>{device.name}</Text></Pressable> : <Text key={id} style={styles.caption}>Device unavailable: {id}</Text>;
        })}
        {!!selected.actions.length && <><Text style={styles.cardTitle}>Command steps</Text>{selected.actions.map((action, index) => <DetailRow key={index} label={'Step ' + (index + 1) + ' / ' + (action.active === undefined ? 'Status not reported' : action.active ? 'Enabled' : 'Disabled')} value={(devices.find(device => device.id === action.deviceId)?.name || action.deviceId) + '\nInterface: ' + action.interfaceId} />)}</>}
        <RuleRuns key={selected.id} rule={selected} operations={operations} devices={devices} onDevice={device => { setSelectedId(''); onDevice(device); }} />
      </View>}
    </InfoDialog>
  </View>;
}
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28, gap: 12 }, stack: { gap: 12 }, title: { color: '#303030', fontSize: 22, fontWeight: '600' },
  caption: { color: '#777777', fontSize: 12, lineHeight: 19 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  search: { minHeight: 48, padding: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 9, color: '#303030', fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#DDDDDD', backgroundColor: 'white' },
  selected: { borderColor: '#83AF23', backgroundColor: '#F1F6E7' }, link: { color: '#6D941B', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  badge: { color: '#6D941B', fontSize: 12, fontWeight: '600' }, cardTitle: { color: '#303030', fontSize: 16, lineHeight: 24, fontWeight: '600', marginTop: 8 },
  deviceLink: { minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  button: { minHeight: 44, padding: 10, justifyContent: 'center' }, disabled: { opacity: 0.35 }, metric: { color: '#303030', fontSize: 25, fontWeight: '600' },
  run: { padding: 12, backgroundColor: '#F6F6F6', borderRadius: 9 }, banner: { marginHorizontal: 12, marginBottom: 8, flexDirection: 'row', backgroundColor: '#FFF5DE', borderRadius: 9, alignItems: 'center' },
  bannerBody: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }, bannerTitle: { color: '#76531D', fontSize: 13, lineHeight: 20, fontWeight: '600' }, icon: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
