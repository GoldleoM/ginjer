import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AnalyticsMetric, GaugeMetric } from '../types';

const gaugeWidth = 232;

const segments = 100;
const blue = '#9CCFE7';
const track = '#F1F1F6';

export function formatMetricTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'No timestamp';
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: 'Asia/Kolkata',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  return part('day') + ' ' + part('month') + ' ' + part('year') + ' ' + part('hour') + ':' + part('minute');
}

function FillGauge({ metric }: { metric: GaugeMetric }) {
  const [width, setWidth] = useState(gaugeWidth);
  const scale = width / gaugeWidth;
  const radius = 76 * scale, stroke = 30 * scale, baseline = 104 * scale;
  const range = metric.maximum - metric.minimum;
  const fraction = range > 0 && Number.isFinite(metric.value)
    ? Math.min(1, Math.max(0, (metric.value - metric.minimum) / range)) : 0;
  const point = (fraction: number) => ({
    x: width / 2 - radius * Math.cos(fraction * Math.PI),
    y: baseline - radius * Math.sin(fraction * Math.PI),
  });
  const start = point(0);
  const end = point(1);
  const fillEnd = point(fraction);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={metric.title}
    accessibilityValue={{ min: metric.minimum, max: metric.maximum, now: metric.minimum + fraction * range, text: metric.value.toFixed(2) }}
    style={[styles.gauge, { height: 148 * scale }]}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: segments + 1 }, (_, index) => {
        const position = index / segments;
        const { x, y } = point(position);
        return <View key={index} style={{
          position: 'absolute', left: x - stroke / 2, top: y - 2,
          width: stroke, height: 4,
          backgroundColor: position <= fraction && fraction > 0 ? blue : track,
          transform: [{ rotate: String(position * 180) + 'deg' }],
        }} />;
      })}
      {[{ ...end, color: fraction === 1 ? blue : track }, { ...start, color: fraction > 0 ? blue : track },
        ...(fraction > 0 ? [{ ...fillEnd, color: blue }] : [])].map((cap, index) =>
        <View key={index} style={{ position: 'absolute', left: cap.x - stroke / 2, top: cap.y - stroke / 2, width: stroke, height: stroke, borderRadius: stroke / 2, backgroundColor: cap.color }} />)}
      <Text style={[styles.gaugeValue, { top: 88 * scale, fontSize: 21 * scale, lineHeight: 28 * scale }]}>{metric.value.toFixed(2)}</Text>
      <View style={[styles.gaugeLabels, { top: 126 * scale, left: width / 2 - radius - 4, right: width / 2 - radius - 4 }]}><Text style={styles.scale}>{metric.minimum}</Text><Text style={styles.scale}>{metric.maximum}</Text></View>
    </View>
  </View>;
}

export function MetricCard({ metric, onInfo }: { metric: AnalyticsMetric; onInfo: () => void }) {
  return <View style={[styles.card, metric.kind === 'gauge' && styles.gaugeCard]}>
    <Text accessibilityRole="header" style={styles.title}>{metric.title}</Text>
    {metric.kind === 'gauge' ? <FillGauge metric={metric} /> : <Text style={styles.status}>{metric.value}</Text>}
    <View style={styles.footer}>
      <View style={styles.device}>
        <Text style={styles.metadata} numberOfLines={1} selectable>{metric.deviceId}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={'Information about ' + metric.title + ', device ' + metric.deviceId}
          onPress={onInfo} style={styles.info} hitSlop={6}>
          <MaterialCommunityIcons name="information" size={14} color="#888888" />
        </Pressable>
      </View>
      <Text style={[styles.metadata, styles.timestamp]}>{formatMetricTime(metric.recordedAt)}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 9, paddingHorizontal: 17, paddingTop: 17, paddingBottom: 7, minHeight: 160,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  gaugeCard: { minHeight: 246 },
  title: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: '#252525' },
  status: { fontSize: 25, lineHeight: 34, fontWeight: '600', color: '#303030', marginTop: 24, marginBottom: 16 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, marginTop: 'auto' },
  device: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 },
  metadata: { color: '#AAAAAA', fontSize: 10, lineHeight: 16, flexShrink: 1 },
  timestamp: { paddingVertical: 9 },
  info: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gauge: { width: gaugeWidth, height: 148, maxWidth: '100%', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  gaugeValue: { position: 'absolute', top: 88, width: '100%', textAlign: 'center', fontSize: 21, lineHeight: 28, fontWeight: '600', color: '#303030' },
  gaugeLabels: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between' },
  scale: { color: '#777777', fontSize: 12 },
});
