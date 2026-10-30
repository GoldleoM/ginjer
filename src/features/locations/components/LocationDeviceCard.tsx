import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReadingIcon } from '../../devices/components/DeviceUI';
import type { Device } from '../../devices/types';

export function LocationDeviceCard({ device, top, onDetails, onLayout }: {
  device: Device; top: number; onDetails: () => void; onLayout: (height: number) => void;
}) {
  return <View accessibilityLabel={'Information for ' + device.name} style={[styles.card, { top }]}
    onLayout={event => onLayout(event.nativeEvent.layout.height)}>
    <View style={styles.header}>
      <View style={styles.thumbnail}><Image source={device.image} style={styles.image} resizeMode="contain" accessible={false} /></View>
      <View style={styles.identity}><Text style={styles.name}>{device.name}</Text><Text selectable style={styles.deviceId}>{device.hardwareId}</Text></View>
      <View style={styles.activity}><Text style={styles.activityLabel}>Last Activity</Text><Text style={styles.activityValue}>{device.lastHeard}</Text></View>
    </View>
    <View style={styles.footer}>
      <View style={styles.readings}>{device.readings.slice(0, 2).map(reading => <View key={reading.id} style={styles.reading}>
        <ReadingIcon icon={reading.icon} tone={reading.tone} /><Text style={styles.readingText}>{reading.summary}</Text>
      </View>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={'View details for ' + device.name} onPress={onDetails} style={styles.details}>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#303030" />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { position: 'absolute', left: 12, right: 12, zIndex: 4, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 5, minHeight: 124,
    backgroundColor: 'white', borderRadius: 9, shadowColor: '#000000', shadowOpacity: 0.13, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  thumbnail: { width: 42, height: 42, borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 4, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  identity: { flex: 1, minWidth: 0, gap: 4, paddingTop: 1 },
  name: { color: '#303030', fontSize: 16, lineHeight: 21, fontWeight: '600' },
  deviceId: { color: '#858585', fontSize: 10, lineHeight: 15 },
  activity: { maxWidth: '26%', alignItems: 'flex-end', paddingTop: 2, gap: 4 },
  activityLabel: { color: '#AAAAAA', fontSize: 10, lineHeight: 14 },
  activityValue: { color: '#777777', fontSize: 10, lineHeight: 14, textAlign: 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  readings: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  readingText: { color: '#858585', fontSize: 11 },
  details: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
