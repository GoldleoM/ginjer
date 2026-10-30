import React, { type ComponentProps, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../theme';

export type ProfileIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];
export const profileColors = { text: '#2B2B2B', muted: '#858585', green: theme.colors.primary, error: '#F04438' };

export function ProfileAvatar({ firstName, lastName, variant, onEdit }: {
  firstName: string; lastName: string; variant: 'default' | 'initials'; onEdit?: () => void;
}) {
  const initials = (firstName.trim().charAt(0) + lastName.trim().charAt(0)).toUpperCase() || '?';
  return <View style={styles.avatarWrap}>
    <View accessibilityLabel={variant === 'initials' ? 'Avatar: ' + initials : 'Default profile avatar'} style={[styles.avatar, variant === 'initials' && styles.initialsAvatar]}>
      {variant === 'initials' ? <Text style={styles.initials}>{initials}</Text> : <MaterialCommunityIcons name="account" size={62} color="white" />}
    </View>
    {onEdit && <Pressable accessibilityRole="button" accessibilityLabel="Edit avatar" onPress={onEdit} style={styles.editAvatar}>
      <View style={styles.editBadge}><MaterialCommunityIcons name="pencil" size={13} color="white" /></View>
    </Pressable>}
  </View>;
}

export function ProfileField({ label, icon, error, inputRef, ...props }: TextInputProps & { label: string; icon: ProfileIcon; error?: string; inputRef?: Ref<TextInput> }) {
  const [focused, setFocused] = React.useState(false);
  return <View style={styles.fieldGroup}>
    <View style={[styles.field, focused && { borderColor: profileColors.green, borderWidth: 2 }, !!error && { borderColor: profileColors.error }]}>
      <Text style={[styles.fieldLabel, !!error && { color: profileColors.error }]}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={21} color={error ? profileColors.error : profileColors.text} />
      <TextInput {...props} ref={inputRef} accessibilityLabel={label} accessibilityHint={error || props.accessibilityHint}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholderTextColor="#AAAAAA"
        style={[styles.input, Platform.OS === 'web' && { outlineWidth: 0 }]} />
    </View>
    {error && <View style={styles.errorRow}><MaterialCommunityIcons name="alert-circle-outline" size={14} color={profileColors.error} /><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
  </View>;
}

export function ProfileMenuRow({ icon, label, onPress, destructive = false, last = false }: {
  icon: ProfileIcon; label: string; onPress: () => void; destructive?: boolean; last?: boolean;
}) {
  const color = destructive ? profileColors.error : profileColors.text;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, !last && styles.menuBorder, pressed && { backgroundColor: '#F4F8EC' }]}>
    {!destructive && <MaterialCommunityIcons name={icon} size={21} color={profileColors.green} />}
    <Text style={[styles.menuText, { color }]}>{label}</Text>
    <MaterialCommunityIcons name={destructive ? 'logout' : 'chevron-right'} size={21} color={color} />
  </Pressable>;
}
export const profileStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: profileColors.text },

  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notice: { color: profileColors.green, paddingHorizontal: 20, paddingVertical: 10, fontSize: 13 },
  error: { color: profileColors.error, padding: 16, lineHeight: 20 },
});
const styles = StyleSheet.create({
  avatarWrap: { width: 76, height: 76 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#2B2B2B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initialsAvatar: { backgroundColor: '#EDF3E0' },
  initials: { color: '#6D941B', fontSize: 26, fontWeight: '600' },
  editAvatar: { position: 'absolute', right: -12, bottom: -12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  editBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: profileColors.green, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { gap: 5 },
  field: { minHeight: 58, borderWidth: 1, borderColor: '#9B98A5', borderRadius: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white' },
  fieldLabel: { position: 'absolute', left: 12, top: -9, paddingHorizontal: 4, fontSize: 11, backgroundColor: 'white', color: profileColors.green },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: profileColors.text, paddingVertical: 17 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 14 },
  error: { color: profileColors.error, fontSize: 12, flex: 1 },
  menuRow: { minHeight: 58, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEEEE' },
  menuText: { flex: 1, fontSize: 15, lineHeight: 21 },
});
