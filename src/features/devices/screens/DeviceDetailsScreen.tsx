import React, { useState } from 'react';
import { ResponsiveGrid, responsiveStyles } from '../../../layout/responsive';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, IconButton, PreviewDialog, ReadingIcon } from '../components/DeviceUI';
import type { Device } from '../types';
import { ConnectedDeviceDetails } from '../../workspace/screens/ConnectedDeviceDetails';

function DemoDeviceDetailsScreen({ device, onBack }: { device: Device; onBack: () => void }) {
  const [selected, setSelected] = useState(device.readings[0].id);
  const [locationOpen, setLocationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.shell}>
      <View style={styles.header}><IconButton icon="arrow-left" label="Back to devices" onPress={onBack} color={colors.text} /><Text accessibilityRole="header" style={styles.heading}>Device Details</Text><IconButton icon="dots-vertical" label="Device information" onPress={() => setMenuOpen(true)} color={colors.text} /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.deviceHeader}>
          <View style={styles.thumbnail}><Image source={device.image} resizeMode="contain" style={styles.deviceImage} /></View>
          <View style={styles.identity}><Text style={styles.name}>{device.name}</Text><Text style={styles.hardwareId}>{device.hardwareId}</Text><Text style={styles.lastHeard}>Last Heard : {device.lastHeardDetail}</Text></View>
        </View>
        <View style={styles.metadata}><View style={styles.metadataColumn}><Text style={styles.label}>Location</Text><Text style={styles.value}>{device.location}</Text></View><View style={styles.metadataColumn}><Text style={styles.label}>Main Output</Text><Text style={styles.value}>{device.mainOutput}</Text></View></View>
        <ResponsiveGrid minimumWidth={156} maximumColumns={4}>{device.readings.map(reading => <Pressable key={reading.id} accessibilityRole="button" accessibilityState={{ selected: selected === reading.id }} accessibilityLabel={`${reading.title}, ${reading.label}, ${reading.value}`} onPress={() => setSelected(reading.id)} style={[styles.output, selected === reading.id && styles.selectedOutput]}>
          <View style={styles.outputHeader}><Text style={styles.outputTitle}>{reading.title}</Text><ReadingIcon icon={reading.icon} tone={reading.tone} large /></View>
          <Text style={styles.outputLabel}>{reading.label}</Text><Text style={styles.outputValue}>{reading.value}</Text>
        </Pressable>)}</ResponsiveGrid>
        <ImageBackground source={require('../../../../assets/images/devices/map.png')} style={styles.map} imageStyle={styles.mapImage} resizeMode="cover" accessibilityLabel="Static sample map from supplied design">
          <Pressable accessibilityRole="button" accessibilityLabel="View sample location" onPress={() => setLocationOpen(true)} style={styles.viewMap}><Text style={styles.viewMapText}>View Map</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Show sample location card" onPress={() => setLocationOpen(true)} style={styles.marker}><MaterialCommunityIcons name="water" size={23} color="#FF624F" /></Pressable>
          {locationOpen && <View style={styles.locationCard}>
            <Image source={require('../../../../assets/images/devices/location.png')} style={styles.locationImage} resizeMode="cover" />
            <View style={styles.locationInfo}><Text style={styles.locationName}>Central Park</Text><Text style={styles.address} numberOfLines={1}>New York, NY 100...</Text><Text style={styles.coordinates}>40.785091, -73.968285</Text></View>
            <View style={styles.locationActions}><IconButton icon="close" label="Close location card" onPress={() => setLocationOpen(false)} /><View style={styles.directionIcon}><MaterialCommunityIcons name="directions" size={22} color="white" /></View></View>
          </View>}
        </ImageBackground>
        <Text style={styles.caption}>Sample data and map from the design. Live location and device controls will be connected later.</Text>
      </ScrollView>
    </View>
    <PreviewDialog visible={menuOpen} title="Device information" onClose={() => setMenuOpen(false)}><Text style={styles.dialogText}>{device.name}{'\n'}{device.hardwareId}{'\n\n'}This is a sample device for reviewing the screens. Outputs, dates and map are illustrative. Device commands are not connected.</Text></PreviewDialog>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, shell: responsiveStyles.shell,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 }, heading: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 21, fontWeight: '700', color: colors.text },
  content: { paddingHorizontal: 16, paddingBottom: 24 }, deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 12, paddingBottom: 16 }, thumbnail: { width: 66, height: 66, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 10, overflow: 'hidden' }, deviceImage: { width: '100%', height: '100%' },
  identity: { flex: 1, minWidth: 0, gap: 6 }, name: { fontSize: 19, fontWeight: '600', color: colors.text }, hardwareId: { color: colors.muted, fontSize: 14 }, lastHeard: { fontSize: 13, lineHeight: 19, color: colors.muted },
  metadata: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E6E6E6', paddingVertical: 18, marginHorizontal: -8, paddingHorizontal: 8, marginBottom: 18 }, metadataColumn: { flex: 1, minWidth: 0, gap: 5 }, label: { color: colors.light, fontSize: 13, fontWeight: '500' }, value: { fontSize: 16, color: colors.text, fontWeight: '500' },
  output: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: 'transparent', padding: 13, minHeight: 110 }, selectedOutput: { borderColor: '#D2E4B0', shadowColor: colors.green, shadowOpacity: 0.6, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 }, outputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, marginBottom: 13 }, outputTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }, outputLabel: { fontSize: 13, fontWeight: '500', color: '#999999', marginBottom: 4 }, outputValue: { fontSize: 17, fontWeight: '500', color: colors.text },
  map: { width: '100%', height: 320, marginTop: 18, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, mapImage: { borderRadius: 10 }, viewMap: { position: 'absolute', right: 12, top: 12, borderRadius: 24, backgroundColor: '#77777799', paddingVertical: 8, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' }, viewMapText: { color: 'white', fontWeight: '600', fontSize: 13 }, marker: { position: 'absolute', left: '46%', bottom: '10%', width: 38, height: 38, borderRadius: 30, backgroundColor: '#FF624F33', alignItems: 'center', justifyContent: 'center' },
  locationCard: { backgroundColor: 'white', width: '91%', flexDirection: 'row', padding: 12, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5, alignItems: 'center', gap: 10 }, locationImage: { width: '29%', aspectRatio: 1.2, borderRadius: 5 }, locationInfo: { flex: 1, minWidth: 0, gap: 4 }, locationName: { color: colors.text, fontSize: 16, fontWeight: '600' }, address: { fontSize: 11, color: colors.muted, fontWeight: '500' }, coordinates: { fontSize: 10, fontWeight: '600', color: colors.text, marginTop: 16 }, locationActions: { alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', margin: -7 }, directionIcon: { width: 34, height: 34, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  caption: { fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 12 }, dialogText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});

export function DeviceDetailsScreen(props: { device: Device; onBack: () => void; onRefresh?: () => void; refreshing?: boolean; error?: string }) {
  return props.device.source === 'live' ? <ConnectedDeviceDetails {...props} /> : <DemoDeviceDetailsScreen {...props} />;
}
