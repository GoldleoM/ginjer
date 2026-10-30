import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, PanResponder, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { fitMap, gestureMap, type MapTouch, type MapViewState, MAX_ZOOM, MIN_ZOOM, projectPoint, screenPoint, TILE_SIZE, unprojectPoint } from '../services/mapGeometry';
import type { Coordinates } from '../types';
import { WorkspacePicker } from './WorkspaceUI';
import { MapTile } from './MapTile';

const tileTemplate = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export function LiveMap({ devices, selectedId, onSelect, onBackground }: {
  devices: Device[]; selectedId?: string; onSelect: (device: Device) => void; onBackground?: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<{ center: Coordinates; zoom: number }>({ center: { lat: 0, lng: 0 }, zoom: 3 });
  const [fittedKey, setFittedKey] = useState('');
  const [tileError, setTileError] = useState(false);
  const [tileRevision, setTileRevision] = useState(0);
  const [cluster, setCluster] = useState<Device[] | null>(null);
  const valid = devices.filter(device => !!device.coordinates);
  const positionsKey = valid.map(device => device.id + ':' + device.coordinates!.lat + ',' + device.coordinates!.lng).join('|');
  const viewportKey = positionsKey + ':' + size.width + ':' + size.height;
  const latest = useRef(view); latest.current = view;
  const mapRef = useRef<View>(null);
  const mapOrigin = useRef({ x: 0, y: 0 });
  const latestSize = useRef(size); latestSize.current = size;
  const gestureStart = useRef<{ view: MapViewState; touches: MapTouch[] } | null>(null);
  function measureOrigin() {
    mapRef.current?.measureInWindow((x, y) => {
      mapOrigin.current = { x: x + (Platform.OS === 'web' ? window.scrollX : 0), y: y + (Platform.OS === 'web' ? window.scrollY : 0) };
    });
  }
  useEffect(() => {
    if (size.width && size.height && valid.length) setView(fitMap(valid.map(device => device.coordinates!), size.width, size.height));
    setFittedKey(viewportKey);
    setTileError(false);
  }, [positionsKey, size.width, size.height]);
  const pan = useMemo(() => {
    const touches = (event: GestureResponderEvent): MapTouch[] => event.nativeEvent.touches.slice(0, 2).map(touch => ({ x: touch.pageX - mapOrigin.current.x, y: touch.pageY - mapOrigin.current.y }));
    const begin = (event: GestureResponderEvent) => { gestureStart.current = { view: latest.current, touches: touches(event) }; };
    const wantsGesture = (event: GestureResponderEvent, gesture: { dx: number; dy: number }) => event.nativeEvent.touches.length > 1 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5;
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: event => { measureOrigin(); return event.nativeEvent.touches.length > 1; },
      onMoveShouldSetPanResponder: wantsGesture,
      onMoveShouldSetPanResponderCapture: wantsGesture,
      onPanResponderGrant: begin,
      onPanResponderStart: begin,
      onPanResponderEnd: begin,
      onPanResponderMove: event => {
        const current = touches(event), start = gestureStart.current;
        if (!start || start.touches.length !== current.length) { begin(event); return; }
        const next = gestureMap(start.view, start.touches, current, latestSize.current.width, latestSize.current.height);
        latest.current = next;
        setView(next);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => { gestureStart.current = null; },
      onPanResponderTerminate: () => { gestureStart.current = null; },
    });
  }, []);
  const tileZoom = Math.floor(view.zoom), tileSize = TILE_SIZE * 2 ** (view.zoom - tileZoom);
  const center = projectPoint(view.center, view.zoom), count = 2 ** tileZoom;
  const left = center.x - size.width / 2, top = center.y - size.height / 2;
  const tiles: { key: string; x: number; y: number; url: string }[] = [];
  for (let row = Math.floor(top / tileSize); row <= Math.floor((top + size.height) / tileSize); row++) {
    if (row < 0 || row >= count) continue;
    for (let column = Math.floor(left / tileSize); column <= Math.floor((left + size.width) / tileSize); column++) {
      const wrapped = ((column % count) + count) % count;
      tiles.push({ key: tileZoom + ':' + column + ':' + row, x: column * tileSize - left, y: row * tileSize - top,
        url: tileTemplate.replace('{z}', String(tileZoom)).replace('{x}', String(wrapped)).replace('{y}', String(row)) });
    }
  }
  const groups = new Map<string, { x: number; y: number; devices: Device[] }>();
  for (const device of valid) {
    const point = screenPoint(device.coordinates!, view.center, view.zoom, size.width, size.height);
    if (point.x < -40 || point.y < -40 || point.x > size.width + 40 || point.y > size.height + 40) continue;
    const key = Math.round(point.x / 44) + ':' + Math.round(point.y / 44);
    const group = groups.get(key);
    if (group) group.devices.push(device); else groups.set(key, { ...point, devices: [device] });
  }
  function zoomBy(delta: number) { setView(value => ({ ...value, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value.zoom + delta)) })); setTileError(false); }
  return <View ref={mapRef} style={[styles.map, Platform.OS === 'web' && ({ touchAction: 'none' } as ViewStyle)]} onLayout={event => { setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height }); measureOrigin(); }} {...pan.panHandlers}>
    {size.width > 0 && size.height > 0 && valid.length > 0 && fittedKey === viewportKey && tiles.map(tile =>
      <MapTile key={tile.key + ':' + tileRevision} uri={tile.url} x={tile.x} y={tile.y} size={tileSize + 0.5} onError={() => setTileError(true)} />)}
    <Pressable accessibilityRole="button" accessibilityLabel="Close map selection" accessible={!!selectedId} focusable={!!selectedId}
      onPress={onBackground} style={StyleSheet.absoluteFill} />
    {[...groups.entries()].map(([key, group]) => <Pressable key={key} accessibilityRole="button"
      accessibilityLabel={group.devices.length > 1 ? group.devices.length + ' devices at this location. Choose a device' : 'Show ' + group.devices[0].name}
      accessibilityState={{ selected: group.devices.some(device => device.id === selectedId) }}
      onPress={() => group.devices.length > 1 ? setCluster(group.devices) : onSelect(group.devices[0])}
      style={[styles.marker, { left: group.x - 24, top: group.y - 24 }, group.devices.some(device => device.id === selectedId) && styles.selected]}>
      {group.devices.length > 1 ? <Text style={styles.cluster}>{group.devices.length}</Text>
        : <MaterialCommunityIcons name={group.devices[0].icon ?? 'router-wireless'} size={24} color="white" />}
    </Pressable>)}
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" disabled={view.zoom === MAX_ZOOM} onPress={() => zoomBy(1)} style={styles.control}><MaterialCommunityIcons name="plus" size={24} color="#303030" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" disabled={view.zoom === MIN_ZOOM} onPress={() => zoomBy(-1)} style={styles.control}><MaterialCommunityIcons name="minus" size={24} color="#303030" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fit all devices on map" onPress={() => setView(fitMap(valid.map(device => device.coordinates!), size.width, size.height))} style={styles.control}><MaterialCommunityIcons name="fit-to-screen-outline" size={22} color="#6D941B" /></Pressable>
    </View>
    {tileError && <Pressable accessibilityRole="button" onPress={() => { setTileError(false); setTileRevision(value => value + 1); }} style={styles.tileError}><Text style={styles.tileErrorText}>Map tiles unavailable · Tap to retry</Text></Pressable>}
    <Pressable accessibilityRole="link" accessibilityLabel="OpenStreetMap attribution" onPress={() => { void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {}); }} style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap contributors</Text></Pressable>
    {cluster && <WorkspacePicker title="Devices at this location" selectedId={selectedId} items={cluster.map(device => ({ id: device.id, name: device.name, subtitle: device.hardwareId }))}
      onClose={() => setCluster(null)} onSelect={id => { const device = cluster.find(item => item.id === id); if (device) onSelect(device); setCluster(null); }} />}
  </View>;
}
const styles = StyleSheet.create({
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#E4EDE9' },
  marker: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#6FA9DD', borderWidth: 3, borderColor: '#FFFFFFCC', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  selected: { backgroundColor: '#83AF23', borderColor: 'white' }, cluster: { fontSize: 20, fontWeight: '600', color: 'white' },
  controls: { position: 'absolute', right: 12, top: 12, backgroundColor: 'white', borderRadius: 8, elevation: 4, overflow: 'hidden' },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEEEE' },
  attribution: { position: 'absolute', right: 0, bottom: 0, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#FFFFFFEE' },
  attributionText: { color: '#555555', fontSize: 9 }, tileError: { position: 'absolute', left: 8, top: 8, right: 65, padding: 10, backgroundColor: '#FFFFFFEE', borderRadius: 7 },
  tileErrorText: { color: '#858585', fontSize: 11, lineHeight: 17 },
});
