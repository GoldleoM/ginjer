import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DeviceIcon, Tone } from '../types';

export const colors = { text: '#2B2B2B', muted: '#858585', light: '#AAAAAA', green: '#83AF23', background: '#F8F8F8' };
export const tones = {
  neutral: { background: '#EEEEEE', foreground: '#777777' },
  green: { background: '#EAF5DC', foreground: '#9BD14F' },
  yellow: { background: '#FFF5D9', foreground: '#FFCC32' },
  red: { background: '#FFE0DB', foreground: '#FF624F' },
};
export function IconButton({ icon, label, onPress, color = colors.muted }: { icon: DeviceIcon; label: string; onPress: () => void; color?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.55 }]}>
    <MaterialCommunityIcons name={icon} size={25} color={color} />
  </Pressable>;
}
export function ReadingIcon({ icon, tone, large = false }: { icon: DeviceIcon; tone: Tone; large?: boolean }) {
  return <View style={[styles.badge, { backgroundColor: tones[tone].background }, large && styles.largeBadge]}>
    <MaterialCommunityIcons name={icon} size={large ? 22 : 17} color={tones[tone].foreground} />
  </View>;
}
export function PreviewDialog({ visible, title, children, onClose }: { visible: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close dialog" />
      <View accessibilityViewIsModal style={styles.dialog}>
        <View style={styles.dialogHeader}><Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text><IconButton icon="close" label="Close dialog" onPress={onClose} /></View>
        <ScrollView style={{ maxHeight: 380 }}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 26, height: 26, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  largeBadge: { width: 34, height: 34 },
  modalBackdrop: { flex: 1, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 18, padding: 20 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  dialogTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: colors.text },
});
