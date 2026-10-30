import React, { Children, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gridGeometry, MAX_CONTENT_WIDTH } from './geometry';

export const responsiveStyles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  readable: { width: '100%', maxWidth: 760, alignSelf: 'center' },
});

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(MAX_CONTENT_WIDTH, Math.max(0, width - insets.left - insets.right));
  return { width: contentWidth, height, fontScale, isTablet: contentWidth >= 700, isShort: height < 500 };
}

// Measure the container again when rotating or resizing, rather than assuming a device model.
export function useResponsiveColumns(minimumWidth = 300, padding = 12, gap = 12, maximumColumns = 3) {
  const layout = useResponsiveLayout();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const onLayout = (event: LayoutChangeEvent) => setMeasuredWidth(event.nativeEvent.layout.width);
  const geometry = gridGeometry(Math.max(0, (measuredWidth ?? layout.width) - padding * 2), minimumWidth, gap, maximumColumns, layout.fontScale);
  return { ...geometry, onLayout, itemStyle: { width: geometry.itemWidth, minWidth: 0 } };
}

export function ResponsiveGrid({ children, minimumWidth = 300, gap = 12, maximumColumns = 3 }: {
  children: React.ReactNode; minimumWidth?: number; gap?: number; maximumColumns?: number;
}) {
  const { onLayout, itemStyle } = useResponsiveColumns(minimumWidth, 0, gap, maximumColumns);
  return <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: '100%', minWidth: 0 }}>
    {Children.map(children, child => child == null || typeof child === 'boolean' ? null : <View style={itemStyle}>{child}</View>)}
  </View>;
}
