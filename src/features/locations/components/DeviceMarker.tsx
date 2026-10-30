import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { LocatedDevice, MarkerTone } from '../types';

const markerColors: Record<MarkerTone, { solid: string; halo: string }> = {
  green: { solid: '#9DBD62', halo: '#9DBD6238' },
  orange: { solid: '#EA994A', halo: '#EA994A38' },
  red: { solid: '#ED6652', halo: '#ED665238' },
  yellow: { solid: '#E9CF50', halo: '#E9CF5038' },
  blue: { solid: '#7DB6F7', halo: '#7DB6F738' },
};
export function DeviceMarker({ item, x, y, selected, onPress }: {
  item: LocatedDevice; x: number; y: number; selected: boolean; onPress: () => void;
}) {
  const color = markerColors[item.marker.tone];
  const icon = item.marker.kind === 'bin' ? 'delete' : item.marker.kind === 'temperature' ? 'thermometer' : 'water';
  return <Pressable accessibilityRole="button" accessibilityLabel={item.device.name + ', ' + item.device.hardwareId + '. Show device information'}
    accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.halo, { left: x - 43, top: y - 43, backgroundColor: color.halo }, selected && styles.selected, pressed && { opacity: 0.8 }]}>
    <View style={[styles.pin, { backgroundColor: color.solid }]}>
      {item.marker.kind === 'celsius' ? <Text style={styles.letter}>C</Text> : <MaterialCommunityIcons name={icon} size={25} color="white" />}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  halo: { position: 'absolute', width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  letter: { color: 'white', fontSize: 24, fontWeight: '500' },
  selected: { borderWidth: 2, borderColor: '#FFFFFFCC' },
});
