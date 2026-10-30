import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { theme } from "../theme";

type Props = TextInputProps & {
  label: string;
  trailing?: React.ReactNode;
  invalid?: boolean;
  inputRef?: React.Ref<TextInput>;
};

export function OutlinedInput({
  label,
  trailing,
  invalid,
  style,
  onFocus,
  onBlur,
  inputRef,
  ...props
}: Props) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View>
      <View
        style={[
          styles.box,
          focused && { borderColor: theme.colors.primary },
          invalid && { borderColor: theme.colors.error },
        ]}
      >
        <TextInput
          {...props}
          ref={inputRef}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, style, Platform.OS === "web" && styles.webInput]}
          placeholderTextColor={theme.colors.muted}
        />
        {trailing}
      </View>
      <Text pointerEvents="none" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 8,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: theme.colors.background,
  },
  label: {
    position: "absolute",
    // Keep the label outside the bordered native view and above the input.
    zIndex: 1,
    top: -10,
    left: 14,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 4,
    color: "#666666",
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
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
  // Override the browser's automatic focus ring on the inner input.
  webInput: {
    borderWidth: 0,
    outlineStyle: "solid",
    outlineWidth: 0,
    outlineColor: "transparent",
    boxShadow: "none",
  },
});
