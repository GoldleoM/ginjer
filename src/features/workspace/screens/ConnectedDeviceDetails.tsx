import React, { useState } from 'react';
import { ResponsiveGrid } from '../../../layout/responsive';
import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { LiveMap } from '../components/LiveMap';
import { ActionIcon, DetailRow, DeviceThumbnail, Feedback, liveStyles } from '../components/WorkspaceUI';
import { useDeviceInspection, type InspectionTab } from '../useDeviceInspection';
import { formatPacketValue, packetValues, type DeviceInspectionApi, type DeviceLog, type DevicePacket, type HistoryRange } from '../services/deviceInspection';
import { formatTime } from '../services/normalizers';
import { DownlinkSheet } from '../components/DownlinkSheet';
import { HistoryTrends } from '../components/HistoryTrends';

const connectivityLabels: Record<string, string> = { LORAWAN: 'LoRaWAN', WIFI: 'Wi-Fi', BLUETOOTH: 'Bluetooth', WIFI_IOT_DEV: 'Wi-Fi IoT' };
const connectivityLabel = (value?: string) => connectivityLabels[value || ''] || value;

function Metadata({ label, value }: { label: string; value: unknown }) {
  return <DetailRow label={label} value={value === undefined || value === null || value === '' ? 'Not reported' : value} />;
}
function PacketCard({ packet, device, latest = false }: { packet: DevicePacket; device: Device; latest?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const values = packetValues(packet, device);
  return <View style={liveStyles.card}>
    <View style={styles.packetHeader}><MaterialCommunityIcons name="access-point" size={20} color="#83AF23" />
      <Text style={styles.packetTitle}>{latest ? 'Latest received packet' : formatTime(packet.timestamp)}</Text></View>
    {latest && <Text style={styles.caption}>{formatTime(packet.timestamp)}</Text>}
    {!!values.length && <View style={styles.packetValues}>{values.map(value => <View key={value.id} style={styles.packetValue}>
      <Text style={styles.label}>{value.name}</Text><Text selectable style={styles.packetReading}>{value.value}</Text></View>)}</View>}
    <View style={styles.radio}>
      {!!packet.rssi && <Text style={styles.caption}>RSSI: {packet.rssi}</Text>}
      {!!packet.snr && <Text style={styles.caption}>SNR: {packet.snr}</Text>}
      {!!packet.port && <Text style={styles.caption}>Port: {packet.port}</Text>}
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.toggle}>
      <Text style={styles.linkText}>{expanded ? 'Hide packet details' : 'Packet details'}</Text><MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={21} color="#6D941B" />
    </Pressable>
    {expanded && <View>
      <DetailRow label="Packet ID" value={packet.id} /><DetailRow label="Packet cluster ID" value={packet.clusterId} /><DetailRow label="DevEUI" value={packet.devEui} />
      <DetailRow label="Recorded timestamp" value={packet.timestamp} /><DetailRow label="Frequency" value={packet.frequency} />
      <DetailRow label="Channel" value={packet.channel} /><DetailRow label="Port" value={packet.port} />
      <Text style={styles.rawLabel}>Payload</Text><Text selectable style={styles.raw}>{formatPacketValue(packet.payload)}</Text>
      {packet.decoded !== undefined && packet.decoded !== null && <><Text style={styles.rawLabel}>Decoded data</Text><Text selectable style={styles.raw}>{formatPacketValue(packet.decoded)}</Text></>}
    </View>}
  </View>;
}
function LogsList({ logs }: { logs: DeviceLog[] }) {
  const [visible, setVisible] = useState(25);
  return <View style={styles.stack}>
    {logs.slice(0, visible).map((log, index) => <View key={(log.timestamp || '') + ':' + index} style={liveStyles.card}>
      <View style={styles.logHeader}><Text style={[styles.logType, /error|fail/i.test(log.type) && styles.error]}>{log.type || 'Activity'}</Text><Text style={styles.caption}>{formatTime(log.timestamp)}</Text></View>
      <Text selectable style={styles.logMessage}>{log.message || 'No message reported'}</Text>
    </View>)}
    {visible < logs.length && <Pressable accessibilityRole="button" onPress={() => setVisible(value => value + 25)} style={styles.pageButton}><Text style={styles.linkText}>Show more logs ({logs.length - visible} remaining)</Text></Pressable>}
  </View>;
}
export function ConnectedDeviceDetails({ device, onBack, onRefresh, refreshing = false, error, inspectionApi }: {
  device: Device; onBack: () => void; onRefresh?: () => void; refreshing?: boolean; error?: string; inspectionApi?: DeviceInspectionApi;
}) {
  const [tab, setTab] = useState<InspectionTab>('details');
  const [mapError, setMapError] = useState('');
  const [downlinkOpen, setDownlinkOpen] = useState(false);
  const [historyView, setHistoryView] = useState<'packets' | 'trends'>('packets');
  const model = useDeviceInspection(device, tab, inspectionApi);
  const info = model.details.data;
  const mainOutputId = info?.mainOutputId || device.mainOutputId;
  const mainOutput = mainOutputId ? device.readings.find(reading => reading.id === mainOutputId)?.title : device.mainOutput;
  const busy = refreshing || (tab === 'details' ? model.details.busy : tab === 'history' ? model.history.busy : model.logs.busy);
  const refresh = () => { model.refresh(); onRefresh?.(); };
  async function openMap() {
    if (!device.coordinates) return;
    const { lat, lng } = device.coordinates;
    try { await Linking.openURL('https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=16/' + lat + '/' + lng); }
    catch { setMapError('Unable to open the map. Please try again.'); }
  }
  return <SafeAreaView style={liveStyles.safe} edges={['top', 'bottom', 'left', 'right']}><View style={liveStyles.shell}>
    <View style={styles.header}><ActionIcon icon="arrow-left" label="Back to previous page" onPress={onBack} />
      <Text accessibilityRole="header" style={styles.heading}>Device Details</Text>
      {busy ? <View style={styles.icon}><ActivityIndicator color="#83AF23" accessibilityLabel="Refreshing device" /></View> : <ActionIcon icon="refresh" label="Refresh device" onPress={refresh} />}
    </View>
    <View accessibilityRole="tablist" style={styles.tabs}>{([['details', 'Details'], ['history', 'History'], ['logs', 'Logs']] as const).map(([value, label]) =>
      <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}>
        <Text style={[styles.tabLabel, tab === value && styles.linkText]}>{label}</Text></Pressable>)}</View>
    <ScrollView key={tab} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor="#83AF23" />}>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {tab === 'details' ? <>
        <View style={styles.identity}><DeviceThumbnail device={info?.imageUri ? { ...device, image: { uri: info.imageUri } } : device} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>{device.name}</Text>
            <Text selectable style={styles.caption}>{device.devEui ? 'DevEUI: ' + device.devEui : 'Hardware ID: ' + device.hardwareId}</Text>
            <Text style={styles.caption}>Last heard: {device.lastHeardDetail}</Text></View></View>
        {device.deleted && <Text style={styles.archived}>Archived device</Text>}
        {!device.deleted && <Pressable accessibilityRole="button" onPress={() => setDownlinkOpen(true)} style={[styles.range, styles.selectedRange, { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }]}><MaterialCommunityIcons name="download-network-outline" size={20} color="#6D941B" /><Text style={styles.linkText}>Send Downlink</Text></Pressable>}
        {!!device.description && <Text style={styles.description}>{device.description}</Text>}
        {!!model.details.error && <Text accessibilityRole="alert" style={styles.error}>{model.details.error}</Text>}
        {!!info?.warnings.length && <View style={styles.warning}><Text style={styles.label}>Some device information could not be loaded.</Text>
          {info.warnings.map(warning => <Text key={warning} style={styles.caption}>{warning}</Text>)}</View>}
        <ResponsiveGrid minimumWidth={440} maximumColumns={2}>
          <View style={liveStyles.card}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Device information</Text>
            <ResponsiveGrid minimumWidth={180} maximumColumns={2}>
              <Metadata label="Hardware" value={info?.hardwareName} /><Metadata label="Manufacturer" value={info?.manufacturer} />
              <Metadata label="Model" value={info?.model} /><Metadata label="Connectivity" value={connectivityLabel(info?.connectivity || device.hardwareType)} />
              <Metadata label="Main output" value={mainOutput} /><Metadata label="Network" value={info?.networkName} />
              <Metadata label="Network provider" value={info?.networkProvider} /><Metadata label="Network interface" value={info?.networkInterface || device.networkInterface} />
              <Metadata label="Tag" value={info?.tag} /><Metadata label="Project" value={device.projectName} />
              <Metadata label="Cluster" value={device.clusterName} /><Metadata label="Location" value={device.location} />
              <Metadata label="GPS support" value={info?.gpsSupported === undefined ? undefined : info.gpsSupported ? 'Yes' : 'No'} />
              <Metadata label="Status" value={device.deleted ? 'Archived' : 'Current'} />
            </ResponsiveGrid>
            {!!info?.hardwareDescription && <DetailRow label="Hardware description" value={info.hardwareDescription} />}
          </View>
          <View style={liveStyles.card}><Text accessibilityRole="header" style={styles.cardTitle}>Device location</Text>
            {device.coordinates ? <>
              <DetailRow label="Place" value={device.coordinates.placeName} /><DetailRow label="Coordinates" value={device.coordinates.lat + ', ' + device.coordinates.lng} />
              <View style={styles.map}><LiveMap devices={[device]} selectedId={device.id} onSelect={() => {}} /></View>
              <Pressable accessibilityRole="link" onPress={openMap} style={styles.mapLink}><MaterialCommunityIcons name="open-in-new" size={18} color="#6D941B" /><Text style={styles.linkText}>Open map</Text></Pressable>
              {!!mapError && <Text accessibilityRole="alert" style={styles.error}>{mapError}</Text>}
            </> : <Text style={styles.description}>Coordinates have not been reported for this device.</Text>}
          </View>
        </ResponsiveGrid>
        <Text accessibilityRole="header" style={styles.section}>Outputs ({device.readings.length})</Text>
        {device.readings.length ? <ResponsiveGrid minimumWidth={156} maximumColumns={4}>{device.readings.map(reading => <View key={reading.id} style={liveStyles.card}>
          <View style={styles.outputHeader}><Text style={styles.outputTitle}>{reading.title}</Text><MaterialCommunityIcons name={reading.icon} size={22} color={reading.color || '#858585'} /></View>
          {reading.id === mainOutputId && <Text style={styles.mainBadge}>Main output</Text>}
          <Text selectable style={[styles.value, reading.color ? { color: reading.color } : undefined]}>{reading.value}</Text>
          {!!reading.label && <Text style={styles.caption}>{reading.label}</Text>}<Text selectable style={styles.outputId}>ID: {reading.id}</Text>
        </View>)}</ResponsiveGrid> : <Text style={styles.description}>No outputs have been reported.</Text>}
        <Text accessibilityRole="header" style={styles.section}>Attributes ({device.attributes?.length || 0})</Text>
        {device.attributes?.length ? <View style={liveStyles.card}>{device.attributes.map(attribute => <View key={attribute.id}><DetailRow label={attribute.name} value={attribute.value} /><Text selectable style={styles.outputId}>ID: {attribute.id}</Text></View>)}</View>
          : <Text style={styles.description}>No attributes have been reported.</Text>}
        {!!info?.latestPacket && <><Text accessibilityRole="header" style={styles.section}>Latest packet</Text><PacketCard packet={info.latestPacket} device={device} latest /></>}
        {!!info?.latestLog && <View style={{ marginTop: 18 }}><Text style={styles.cardTitle}>Latest activity</Text><LogsList logs={[info.latestLog]} /></View>}
        <Text accessibilityRole="header" style={styles.section}>Identifiers</Text>
        <View style={liveStyles.card}><ResponsiveGrid minimumWidth={240} maximumColumns={2}>
          <Metadata label="Device ID" value={device.id} /><Metadata label="DevEUI" value={device.devEui} />
          <Metadata label="Hardware ID" value={device.hardwareId} /><Metadata label="Network ID" value={device.networkId} />
          <Metadata label="Organization ID" value={device.organizationId} /><Metadata label="Project ID" value={device.projectId} />
          <Metadata label="Cluster ID" value={device.clusterId} /><Metadata label="Main output ID" value={mainOutputId} />
          <Metadata label="Manufacturer ID" value={info?.manufacturerId} /><Metadata label="Tag ID" value={info?.tagId} />
          <Metadata label="Recorded timestamp" value={device.timestamp} />
        </ResponsiveGrid></View>
      </> : tab === 'history' ? <>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Packet history</Text><Text style={styles.description}>{device.name}</Text>
        <View style={styles.ranges}>{(['packets', 'trends'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: historyView === value }} onPress={() => setHistoryView(value)} style={[styles.range, historyView === value && styles.selectedRange]}><Text style={styles.rangeText}>{value === 'packets' ? 'Packets' : 'Charts'}</Text></Pressable>)}</View>
        <View style={styles.ranges}>{([['24h', '24 hours'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']] as [HistoryRange, string][]).map(([value, label]) =>
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: model.range === value }} onPress={() => model.setRange(value)} style={[styles.range, model.range === value && styles.selectedRange]}><Text style={styles.rangeText}>{label}</Text></Pressable>)}</View>
        {model.history.busy ? <Feedback busy /> : model.history.error ? <Feedback title="Unable to load packet history" message={model.history.error} onRetry={model.refresh} /> : <>
          <View style={styles.pagination}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous history page" disabled={model.page <= 1} onPress={() => model.setPage(model.page - 1)} style={[styles.pageButton, model.page <= 1 && styles.disabled]}><Text style={styles.linkText}>Previous</Text></Pressable>
            <Text style={styles.pageCount}>Page {model.history.data?.currentPage || model.page} of {Math.max(1, model.history.data?.totalPages || 1)}{'\n'}{model.history.data?.totalRecords || 0} records</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next history page" disabled={model.page >= (model.history.data?.totalPages || 1)} onPress={() => model.setPage(model.page + 1)} style={[styles.pageButton, model.page >= (model.history.data?.totalPages || 1) && styles.disabled]}><Text style={styles.linkText}>Next</Text></Pressable>
          </View>
          {model.history.data?.packets.length ? historyView === 'trends' ? <HistoryTrends packets={model.history.data.packets} device={device} /> : <View style={styles.stack}>{model.history.data.packets.map(packet => <PacketCard key={packet.id} packet={packet} device={device} />)}</View>
            : <Feedback title="No packets in this period" message="Choose a wider time range or refresh to check for new packets." />}
        </>}
      </> : <>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Device activity logs</Text><Text style={styles.description}>{device.name}</Text>
        {model.logs.busy ? <Feedback busy /> : model.logs.error ? <Feedback title="Unable to load device logs" message={model.logs.error} onRetry={model.refresh} />
          : model.logs.data?.length ? <LogsList logs={model.logs.data} /> : <Feedback title="No activity logs" message="No activity log entries were returned for this device. Received packets are available in History." />}
      </>}
    </ScrollView>
    {downlinkOpen && <DownlinkSheet key={device.id} device={device} onClose={() => setDownlinkOpen(false)} onSent={model.refresh} />}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 8 },
  heading: { flex: 1, minWidth: 0, textAlign: 'center', color: '#303030', fontSize: 18, fontWeight: '600' }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, padding: 4, gap: 4, borderRadius: 10, backgroundColor: '#EAEDE5', marginBottom: 8 },
  tab: { flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, activeTab: { backgroundColor: 'white' }, tabLabel: { color: '#858585', fontSize: 14 },
  content: { padding: 16, paddingTop: 12, paddingBottom: 32 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  name: { color: '#303030', fontSize: 21, fontWeight: '600', lineHeight: 29 }, description: { color: '#858585', fontSize: 14, lineHeight: 23, marginBottom: 16 },
  caption: { color: '#858585', fontSize: 12, lineHeight: 19 }, label: { color: '#777777', fontSize: 12, lineHeight: 18 },
  warning: { padding: 14, gap: 6, backgroundColor: '#FFF7E6', borderRadius: 10, marginBottom: 16 },
  archived: { color: '#94621B', backgroundColor: '#FFF3D9', padding: 12, borderRadius: 8, marginBottom: 16 },
  section: { color: '#303030', fontSize: 17, fontWeight: '600', marginTop: 24, marginBottom: 14 }, sectionTitle: { color: '#303030', fontSize: 19, fontWeight: '600', marginBottom: 8 },
  cardTitle: { color: '#303030', fontSize: 17, fontWeight: '600', marginBottom: 14 },
  outputHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, outputTitle: { flex: 1, color: '#555555', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  value: { color: '#303030', fontSize: 21, fontWeight: '600', lineHeight: 29, marginTop: 18, marginBottom: 8 }, outputId: { color: '#999999', fontSize: 10, lineHeight: 16, marginTop: 9, marginBottom: 6 },
  mainBadge: { color: '#6D941B', fontSize: 11, marginTop: 8 }, map: { height: 280, borderRadius: 8, overflow: 'hidden', marginTop: 12 },
  mapLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', marginTop: 8 },
  linkText: { color: '#6D941B', fontSize: 14, fontWeight: '500' }, error: { color: '#B42318', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  packetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, packetTitle: { flex: 1, color: '#303030', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  packetValues: { marginTop: 14, gap: 12 }, packetValue: { gap: 3 }, packetReading: { color: '#303030', fontSize: 15, lineHeight: 22 },
  radio: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  rawLabel: { color: '#858585', fontSize: 12, marginTop: 16, marginBottom: 8 }, raw: { color: '#555555', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 19, padding: 12, backgroundColor: '#F7F7F7', borderRadius: 8 },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, range: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 22, backgroundColor: 'white' },
  selectedRange: { borderColor: '#83AF23', backgroundColor: '#EFF5E5' }, rangeText: { color: '#6D941B', fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 16 }, pageButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  pageCount: { flex: 1, color: '#858585', fontSize: 11, lineHeight: 18, textAlign: 'center' }, disabled: { opacity: 0.35 }, stack: { gap: 12 },
  logHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, logType: { color: '#6D941B', fontSize: 12, fontWeight: '600' }, logMessage: { color: '#444444', fontSize: 14, lineHeight: 23, marginTop: 12 },
});
