import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';

type Props = TextInputProps & {
  label: string;
  trailing?: React.ReactNode;
  invalid?: boolean;
};

export function OutlinedInput({ label, trailing, invalid, style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[
      styles.box,
      focused && { borderColor: theme.colors.primary },
      invalid && { borderColor: theme.colors.error },
    ]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[styles.input, Platform.OS === 'web' && styles.webInput, style]}
        placeholderTextColor={theme.colors.muted}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 8,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: theme.colors.background,
  },
  label: {
    position: 'absolute',
    top: -11,
    left: 12,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 4,
    color: '#666666',
    fontSize: 14,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 14,
    backgroundColor: theme.colors.background,
  },
  // The outer container supplies the accessible green focus indicator.
  // Suppress the browser's second, rectangular black outline inside it.
  webInput: { outlineWidth: 0 },
});
