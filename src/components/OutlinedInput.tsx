import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';
type Props = TextInputProps & { label: string; trailing?: React.ReactNode; invalid?: boolean };
export function OutlinedInput({ label, trailing, invalid, ...props }: Props) {
  const [focused, setFocused] = React.useState(false);
  return <View style={[styles.box, focused && { borderColor: theme.colors.primary }, invalid && { borderColor: theme.colors.error }]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.input} placeholderTextColor={theme.colors.muted} />
    {trailing}
  </View>;
}
const styles = StyleSheet.create({ box: { borderWidth: 2, borderColor: theme.colors.border, borderRadius: 8, minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }, label: { position: 'absolute', top: -11, left: 12, backgroundColor: 'white', paddingHorizontal: 4, color: '#666666', fontSize: 14 }, input: { flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 14 } });
