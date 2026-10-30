import React, { useState } from 'react';
import { ResponsiveGrid } from '../../../layout/responsive';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { LiveMap } from '../components/LiveMap';
import { ActionIcon, DetailRow, DeviceThumbnail, liveStyles } from '../components/WorkspaceUI';

export function ConnectedDeviceDetails({ device, onBack, onRefresh, refreshing = false, error }: { device: Device; onBack: () => void; onRefresh?: () => void; refreshing?: boolean; error?: string }) {
  const [technical, setTechnical] = useState(false);
  const [mapError, setMapError] = useState('');
  async function openMap() {
    if (!device.coordinates) return;
    const { lat, lng } = device.coordinates;
    try { await Linking.openURL('https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=16/' + lat + '/' + lng); }
    catch { setMapError('Unable to open the map. Please try again.'); }
  }
  return <SafeAreaView style={liveStyles.safe} edges={['top', 'bottom', 'left', 'right']}><View style={liveStyles.shell}>
    <View style={styles.header}><ActionIcon icon="arrow-left" label="Back to previous page" onPress={onBack} /><Text accessibilityRole="header" style={[liveStyles.heading, { flex: 1, minWidth: 0, textAlign: 'center' }]}>Device Details</Text>{onRefresh ? refreshing ? <View style={{ width: 44 }}><ActivityIndicator color="#83AF23" /></View> : <ActionIcon icon="refresh" label="Refresh device" onPress={onRefresh} /> : <View style={{ width: 44 }} />}</View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#83AF23" /> : undefined}>
      {!!error && <Text accessibilityRole="alert" style={[styles.error, { marginBottom: 16 }]}>{error}</Text>}
      <View style={styles.identity}><DeviceThumbnail device={device} size={64} /><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>{device.name}</Text><Text selectable style={styles.id}>{device.hardwareId}</Text><Text style={styles.time}>Last heard · {device.lastHeardDetail}</Text></View></View>
      {device.deleted && <Text style={styles.archived}>Archived device · historical readings</Text>}
      {!!device.description && <Text style={styles.description}>{device.description}</Text>}
      <View style={liveStyles.card}><DetailRow label="Project" value={device.projectName} /><DetailRow label="Cluster" value={device.clusterName} />
        <DetailRow label="Location" value={device.location} /><DetailRow label="Hardware type" value={device.hardwareType} /></View>
      <Text accessibilityRole="header" style={styles.section}>Outputs · {device.readings.length}</Text>
      {device.readings.length ? <ResponsiveGrid minimumWidth={156} maximumColumns={4}>{device.readings.map(reading => <View key={reading.id} style={styles.output}>
        <View style={styles.outputHeader}><Text style={styles.outputTitle}>{reading.title}</Text><MaterialCommunityIcons name={reading.icon} size={22} color={reading.color ?? '#858585'} /></View>
        <Text selectable style={[styles.value, reading.color && { color: reading.color }]}>{reading.value}</Text>
        {!!reading.label && <Text style={styles.outputLabel}>{reading.label}</Text>}
        <Text selectable style={styles.outputId}>ID: {reading.id}</Text>
      </View>)}</ResponsiveGrid> : <Text style={styles.description}>No outputs have been reported.</Text>}
      <Text accessibilityRole="header" style={styles.section}>Attributes · {device.attributes?.length ?? 0}</Text>
      {device.attributes?.length ? <View style={liveStyles.card}>{device.attributes.map(attribute => <View key={attribute.id}><DetailRow label={attribute.name} value={attribute.value} /><Text selectable style={styles.attributeId}>ID: {attribute.id}</Text></View>)}</View>
        : <Text style={styles.description}>No attributes have been reported.</Text>}
      <Text accessibilityRole="header" style={styles.section}>Location</Text>
      {device.coordinates ? <View style={liveStyles.card}>
        <DetailRow label="Place" value={device.coordinates.placeName} /><DetailRow label="Coordinates" value={device.coordinates.lat + ', ' + device.coordinates.lng} />
        <View style={styles.map}><LiveMap devices={[device]} selectedId={device.id} onSelect={() => {}} /></View>
        <Pressable accessibilityRole="link" onPress={openMap} style={styles.mapLink}><MaterialCommunityIcons name="open-in-new" size={18} color="#6D941B" /><Text style={styles.linkText}>Open map</Text></Pressable>
        {!!mapError && <Text accessibilityRole="alert" style={styles.error}>{mapError}</Text>}
      </View> : <Text style={styles.description}>Coordinates have not been reported for this device.</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: technical }} onPress={() => setTechnical(value => !value)} style={styles.technicalToggle}>
        <Text style={styles.linkText}>Technical details</Text><MaterialCommunityIcons name={technical ? 'chevron-up' : 'chevron-down'} size={22} color="#6D941B" /></Pressable>
      {technical && <View style={liveStyles.card}>
        <DetailRow label="Device ID" value={device.id} /><DetailRow label="Hardware ID" value={device.hardwareId} /><DetailRow label="DevEUI" value={device.devEui} />
        <DetailRow label="Network ID" value={device.networkId} /><DetailRow label="Organization ID" value={device.organizationId} />
        <DetailRow label="Project ID" value={device.projectId} /><DetailRow label="Cluster ID" value={device.clusterId} />
        <DetailRow label="Recorded timestamp" value={device.timestamp} /><DetailRow label="Status" value={device.deleted ? 'Archived' : 'Current'} />
      </View>}
    </ScrollView>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, paddingHorizontal: 8 },
  content: { padding: 16, paddingTop: 12, paddingBottom: 32 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  name: { color: '#303030', fontSize: 20, fontWeight: '600', lineHeight: 27 }, id: { color: '#858585', fontSize: 12, lineHeight: 19, marginTop: 5 },
  time: { color: '#999999', fontSize: 11, lineHeight: 18, marginTop: 5 }, description: { color: '#858585', fontSize: 14, lineHeight: 23, marginBottom: 16 },
  archived: { color: '#94621B', backgroundColor: '#FFF3D9', padding: 12, borderRadius: 8, marginBottom: 16 },
  section: { color: '#303030', fontSize: 17, fontWeight: '600', marginTop: 24, marginBottom: 14 },
  output: { minWidth: 0, backgroundColor: 'white', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  outputHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, outputTitle: { flex: 1, color: '#555555', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  value: { color: '#303030', fontSize: 21, fontWeight: '600', lineHeight: 29, marginTop: 20 }, outputLabel: { color: '#858585', fontSize: 12, lineHeight: 19, marginTop: 7 },
  outputId: { color: '#AAAAAA', fontSize: 9, lineHeight: 14, marginTop: 14 }, attributeId: { color: '#AAAAAA', fontSize: 9, marginTop: 3, marginBottom: 6 },
  map: { height: 320, borderRadius: 8, overflow: 'hidden', marginTop: 12 }, mapLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', marginTop: 8 },
  linkText: { color: '#6D941B', fontSize: 14, fontWeight: '500' }, error: { color: '#B42318', fontSize: 13, lineHeight: 20 },
  technicalToggle: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
});
