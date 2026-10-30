import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Device } from '../../devices/types';
import type { DevicePacket } from '../services/deviceInspection';
import { packetTrends } from '../services/deviceInsights';
import { formatTime } from '../services/normalizers';
import { Feedback, liveStyles } from './WorkspaceUI';

const number = (value: number) => Number(value.toPrecision(6)).toLocaleString();
export function HistoryTrends({ packets, device }: { packets: DevicePacket[]; device: Device }) {
  const [selectedId, setSelectedId] = useState('');
  const [pointId, setPointId] = useState('');
  const series = packetTrends(packets, device);
  const current = series.find(item => item.id === selectedId) || series[0];
  if (!current) return <Feedback title="No numeric history on this page" message="Charts use numeric output values from the loaded packets. Try another history page or time range." />;
  const point = current.points.find(point => point.id === pointId) || current.points[current.points.length - 1];
  const lower = Math.min(0, current.min), upper = Math.max(0, current.max), span = upper - lower || 1;
  const zero = upper / span * 130;
  return <View style={[liveStyles.card, { gap: 14 }]}>
    <Text style={styles.title}>Output trends</Text><Text style={styles.caption}>Numeric samples on this history page only, ordered by time. Each bar is one received packet.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 8 }}>{series.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: current.id === item.id }} onPress={() => { setSelectedId(item.id); setPointId(''); }} style={[styles.chip, current.id === item.id && styles.selected]}><Text style={styles.link}>{item.name}</Text></Pressable>)}</ScrollView>
    <View style={styles.stats}>{[['Minimum', current.min], ['Average', current.average], ['Maximum', current.max]].map(([label, value]) => <View key={label} style={{ flex: 1, minWidth: 70 }}><Text style={styles.caption}>{label}</Text><Text style={styles.value}>{number(Number(value))}</Text></View>)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingVertical: 10 }}>
      <View style={{ height: 150, width: Math.max(240, current.points.length * 40), flexDirection: 'row' }}>
        <View style={{ position: 'absolute', top: zero + 8, left: 0, right: 0, height: 1, backgroundColor: '#BBBBBB' }} />
        {current.points.map(sample => {
          const top = Math.min(zero, (upper - sample.value) / span * 130) + 8;
          const height = Math.max(2, Math.abs(sample.value) / span * 130);
          return <Pressable key={sample.id} accessibilityRole="button" accessibilityLabel={formatTime(sample.timestamp) + ': ' + sample.value} accessibilityState={{ selected: sample.id === point.id }} onPress={() => setPointId(sample.id)} style={{ flex: 1, minWidth: 40, height: 150 }}><View style={{ position: 'absolute', top, height, left: 8, right: 8, borderRadius: 3, backgroundColor: sample.id === point.id ? '#527710' : '#A7C66B' }} /></Pressable>;
        })}
      </View>
    </ScrollView>
    <View accessibilityLiveRegion="polite"><Text style={styles.value}>{current.name}: {number(point.value)}</Text><Text style={styles.caption}>{formatTime(point.timestamp)}</Text></View>
    <Text style={styles.caption}>{current.points.length} samples / {formatTime(current.points[0].timestamp)} to {formatTime(current.points[current.points.length - 1].timestamp)}</Text>
  </View>;
}
const styles = StyleSheet.create({ title: { color: '#303030', fontSize: 17, fontWeight: '600' }, caption: { color: '#777777', fontSize: 12, lineHeight: 19 },
  chip: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 22, justifyContent: 'center' }, selected: { backgroundColor: '#F1F6E7', borderColor: '#8BAE41' }, link: { color: '#6D941B', fontSize: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, value: { color: '#303030', fontSize: 16, fontWeight: '600', lineHeight: 24 },
});
