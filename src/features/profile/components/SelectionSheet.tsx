import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileColors, type ProfileIcon } from './ProfileUI';

export function SelectionSheet({ visible, title, items, selectedId, icon, onSelect, onClose }: {
  visible: boolean; title: string; items: { id: string; name: string }[]; selectedId: string | null;
  icon: ProfileIcon; onSelect: (id: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const insets = useSafeAreaInsets();
  useEffect(() => { if (visible) setQuery(''); }, [visible]);
  const filtered = items.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}
    onShow={() => { AccessibilityInfo.announceForAccessibility(title); }}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Close ' + title.toLowerCase() + ' picker'} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.searchRow}>
          <TextInput value={query} onChangeText={setQuery} placeholder={'Search ' + title}
            accessibilityLabel={'Search ' + title} placeholderTextColor={profileColors.muted}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search"
            style={[styles.search, Platform.OS === 'web' && { outlineWidth: 0 }]} />
          <MaterialCommunityIcons name="magnify" size={23} color={profileColors.muted} />
          <Pressable accessibilityRole="button" accessibilityLabel={'Close ' + title.toLowerCase() + ' picker'} onPress={onClose} style={styles.close}>
            <MaterialCommunityIcons name="close" size={23} color={profileColors.text} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.options}>
          {filtered.map(item => <Pressable key={item.id} accessibilityRole="radio"
            accessibilityState={{ checked: item.id === selectedId }} onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.option, item.id === selectedId && styles.selected, pressed && { opacity: 0.65 }]}>
            <View style={styles.badge}><MaterialCommunityIcons name={icon} size={20} color="white" /></View>
            <Text style={styles.optionName}>{item.name}</Text>
            {item.id === selectedId && <MaterialCommunityIcons name="check" size={20} color={profileColors.green} />}
          </Pressable>)}
          {!filtered.length && <Text style={styles.empty}>No results found.</Text>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '70%', minHeight: 240, alignSelf: 'center', backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 4, gap: 10 },
  search: { flex: 1, minWidth: 0, minHeight: 58, paddingVertical: 16, fontSize: 14, color: profileColors.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  options: { flexGrow: 0 },
  option: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  selected: { backgroundColor: '#F2F6E9' },
  badge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#303030', alignItems: 'center', justifyContent: 'center' },
  optionName: { flex: 1, fontSize: 15, color: profileColors.text },
  empty: { padding: 24, color: profileColors.muted, textAlign: 'center' },
});
