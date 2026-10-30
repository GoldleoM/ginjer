import React, { type ReactNode, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { responsiveStyles, useResponsiveLayout } from '../../../layout/responsive';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Device } from '../../devices/types';
import { Image } from 'react-native';

export const liveColors = { green: '#83AF23', dark: '#2B2B2B', muted: '#858585', border: '#E7E7E7', error: '#B42318' };
export function ActionIcon({ icon, label, onPress, disabled = false }: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress}
    style={({ pressed }) => [styles.icon, (pressed || disabled) && { opacity: 0.45 }]}><MaterialCommunityIcons name={icon} size={23} color={liveColors.green} /></Pressable>;
}
export function DeviceThumbnail({ device, size = 44 }: { device: Device; size?: number }) {
  return <View style={[styles.thumbnail, { width: size, height: size }]}>
    {device.image ? <Image source={device.image} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      : <MaterialCommunityIcons name={device.icon ?? 'router-wireless'} size={size * 0.57} color="#83AF23" />}
  </View>;
}
export function WorkspaceBar({ organization, project, busy, onOrganizations, onProjects, onInfo, onRefresh }: {
  organization?: string; project?: string; busy: boolean; onOrganizations: () => void; onProjects: () => void; onInfo: () => void; onRefresh: () => void;
}) {
  const { isTablet, isShort } = useResponsiveLayout();
  const inline = isTablet || isShort;
  return <View style={styles.workspace}>
    <View style={[{ flex: 1, minWidth: 0 }, inline && { flexDirection: 'row', gap: 16 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose organization" onPress={onOrganizations} style={[styles.scopeLine, inline && { flex: 1 }]}>
        <Text numberOfLines={1} style={styles.organization}>{organization || 'Choose organization'}</Text><MaterialCommunityIcons name="chevron-down" size={18} color="#83AF23" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose project" onPress={onProjects} style={[styles.scopeLine, inline && { flex: 1 }]}>
        <Text numberOfLines={1} style={styles.project}>{project || 'Choose project'}</Text><MaterialCommunityIcons name="chevron-down" size={16} color="#858585" />
      </Pressable>
    </View>
    <ActionIcon icon="information-outline" label="Project information" onPress={onInfo} disabled={!project} />
    {busy ? <View style={styles.icon}><ActivityIndicator color="#83AF23" /></View> : <ActionIcon icon="refresh" label="Refresh workspace" onPress={onRefresh} />}
  </View>;
}
export function Feedback({ title, message, busy, onRetry }: { title?: string; message?: string; busy?: boolean; onRetry?: () => void }) {
  return <View style={styles.feedback}>{busy ? <ActivityIndicator color="#83AF23" accessibilityLabel="Loading information" /> : <>
    <MaterialCommunityIcons name={onRetry ? 'cloud-alert' : 'inbox-outline'} size={36} color="#AAAAAA" />
    <Text accessibilityRole={onRetry ? 'alert' : undefined} style={styles.feedbackTitle}>{title || 'Nothing to show yet'}</Text>
    {!!message && <Text style={styles.feedbackText}>{message}</Text>}
    {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable>}
  </>}</View>;
}
export function InfoDialog({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']}><Pressable accessibilityRole="button" accessibilityLabel="Close information" onPress={onClose} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} accessibilityViewIsModal style={styles.dialog}><View style={styles.dialogHeader}><Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text>
        <ActionIcon icon="close" label="Close information" onPress={onClose} /></View><ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: 12 }}>{children}</ScrollView></KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null;
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{String(value)}</Text></View>;
}
export interface PickerItem { id: string; name: string; subtitle?: string; disabled?: boolean; }
export function WorkspacePicker({ title, items, selectedId, onSelect, onClose, busy = false, error, onRefresh, description }: {
  title: string; items: PickerItem[]; selectedId?: string; onSelect: (id: string) => void; onClose: () => void;
  busy?: boolean; error?: string; onRefresh?: () => void; description?: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => items.filter(item => (item.name + ' ' + (item.subtitle ?? '')).toLowerCase().includes(query.trim().toLowerCase())), [items, query]);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']}><Pressable accessibilityRole="button" accessibilityLabel="Close selector" onPress={onClose} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} accessibilityViewIsModal style={[styles.dialog, { height: '75%', maxHeight: '100%' }]}>
        <View style={styles.dialogHeader}><Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text>
          {busy ? <ActivityIndicator color="#83AF23" accessibilityLabel={'Refreshing ' + title.toLowerCase()} /> : onRefresh && <ActionIcon icon="refresh" label={'Refresh ' + title.toLowerCase()} onPress={onRefresh} />}
          <ActionIcon icon="close" label="Close selector" onPress={onClose} /></View>
        {!!description && <Text style={[liveStyles.caption, { marginBottom: 12 }]}>{description}</Text>}
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel={'Search ' + title} placeholder={'Search ' + title.toLowerCase()} autoCorrect={false}
          style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' }]} />
        <FlatList data={filtered} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" style={{ minHeight: 0, flexShrink: 1 }}
          ListHeaderComponent={error ? <Feedback title={'Unable to refresh ' + title.toLowerCase()} message={error} onRetry={onRefresh} /> : null}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === selectedId, disabled: !!item.disabled }}
            disabled={item.disabled} onPress={() => onSelect(item.id)} style={[styles.pickerRow, item.id === selectedId && { backgroundColor: '#F2F6E9' }, item.disabled && { opacity: 0.5 }]}>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={styles.pickerName}>{item.name}</Text>{!!item.subtitle && <Text style={styles.pickerSubtitle}>{item.subtitle}</Text>}</View>
            {item.id === selectedId && <MaterialCommunityIcons name="check" size={21} color="#83AF23" />}
          </Pressable>}
          ListEmptyComponent={busy ? <Feedback busy /> : error ? null : <Feedback title={query ? 'No matches' : 'No ' + title.toLowerCase() + ' available'} message={query ? 'Try another search.' : onRefresh ? 'Refresh to check for updates.' : undefined} />} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
export const liveStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F6F6' }, shell: responsiveStyles.shell,
  card: { backgroundColor: 'white', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  heading: { fontSize: 18, fontWeight: '600', color: '#303030' }, caption: { color: '#858585', fontSize: 12, lineHeight: 18 },
});
const styles = StyleSheet.create({
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  thumbnail: { borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF4', overflow: 'hidden' },
  workspace: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  scopeLine: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  organization: { color: '#303030', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  project: { color: '#858585', fontSize: 12, flexShrink: 1 },
  feedback: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12, minHeight: 220 },
  feedbackTitle: { fontSize: 18, color: '#303030', fontWeight: '600', textAlign: 'center' },
  feedbackText: { fontSize: 14, lineHeight: 22, color: '#858585', textAlign: 'center' },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  actionText: { color: '#6D941B', fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#00000066' },
  dialog: { width: '100%', maxWidth: 520, maxHeight: '100%', backgroundColor: 'white', borderRadius: 16, padding: 18 },
  dialogHeader: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dialogTitle: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: '600', color: '#303030' },
  detailRow: { paddingVertical: 11, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEEEE' },
  detailLabel: { color: '#858585', fontSize: 12 },
  detailValue: { color: '#303030', fontSize: 14, lineHeight: 21 },
  search: { minHeight: 48, borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, fontSize: 14, color: '#303030' },
  pickerRow: { minHeight: 64, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEEEE' },
  pickerName: { color: '#303030', fontSize: 15, lineHeight: 21 },
  pickerSubtitle: { color: '#858585', fontSize: 12, lineHeight: 18, marginTop: 4 },
});
