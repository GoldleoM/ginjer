import React, { useRef, useState } from "react";
import { useResponsiveLayout } from '../../../layout/responsive';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { OutlinedInput } from "../../../components/OutlinedInput";
import { theme  } from "../../../theme";
import { signIn } from "../services/auth";
import { validateCredentials } from "../services/validation";
import type { AuthUser } from "../types";
export function SignInScreen({
  onSignedIn,
  onPreview,
}: {
  onSignedIn: (user: AuthUser) => void;
  onPreview: () => void;
}) {
  const { isTablet, isShort } = useResponsiveLayout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const passwordRef = useRef<TextInput>(null);
  async function submit() {
    if (submitting.current) return;
    const validation = validateCredentials(email, password);
    setError(validation);
    if (validation) return;
    submitting.current = true;
    setBusy(true);
    try {
      onSignedIn(await signIn(email, password));
      setPassword("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to sign in. Please try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={[styles.content, isTablet && styles.tabletContent, isShort && { paddingVertical: 20 }]}
          keyboardShouldPersistTaps='handled'
          automaticallyAdjustKeyboardInsets
        >
          <View style={[styles.intro, isTablet && styles.tabletColumn]}>
            <View style={styles.brand}>
              <Image
                source={require("../../../../assets/images/ginjer-logo.png")}
                style={styles.logo}
                resizeMode='contain'
                accessibilityLabel='Ginjer, powered by SenRa'
              />
              <Text style={styles.tagline}>
                A new way to Sense, Control and Automate
              </Text>
            </View>
            <Image
              source={require("../../../../assets/images/sign-in-illustration.png")}
              style={[styles.illustration, isTablet && { width: 260 }, isShort && { width: 120 }]}
              resizeMode='contain'
              accessible={false}
            />
          </View>
          <View style={[styles.form, isTablet && styles.tabletColumn]}>
            <OutlinedInput
              label='Email ID*'
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              autoCapitalize='none'
              autoCorrect={false}
              autoComplete='email'
              textContentType='username'
              placeholder='Enter your email'
              editable={!busy}
              returnKeyType='next'
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <OutlinedInput
              inputRef={passwordRef}
              label='Password*'
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize='none'
              autoCorrect={false}
              autoComplete='current-password'
              textContentType='password'
              placeholder='Enter your password'
              editable={!busy}
              returnKeyType='go'
              onSubmitEditing={submit}
              trailing={
                <Pressable
                  onPress={() => setVisible(!visible)}
                  accessibilityRole='button'
                  accessibilityLabel={
                    visible ? "Hide password" : "Show password"
                  }
                  style={styles.eye}
                >
                  <MaterialCommunityIcons
                    name={visible ? "eye-outline" : "eye-off-outline"}
                    size={23}
                    color={theme.colors.text}
                  />
                </Pressable>
              }
            />
            {error && (
              <Text
                accessibilityRole='alert'
                accessibilityLiveRegion='polite'
                style={styles.error}
              >
                {error}
              </Text>
            )}
            <Pressable
              accessibilityRole='button'
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed || busy ? 0.7 : 1 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color='white' />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole='button'
              onPress={onPreview}
              disabled={busy}
              style={styles.previewButton}
            >
              <Text style={styles.previewText}>Preview sample screens</Text>
            </Pressable>
            <Text style={styles.legal}>Use your Ginjer account to access your organizations and projects.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    justifyContent: "center",
    gap: 28,
  },
  tabletContent: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingHorizontal: 32 },
  intro: { alignItems: 'center', width: '100%', maxWidth: 440, alignSelf: 'center' },
  tabletColumn: { flex: 1, minWidth: 0 },
  brand: { alignItems: "center", width: '100%' },
  logo: { width: 190, maxWidth: '100%', height: 78 },
  tagline: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  illustration: {
    width: 180,
    aspectRatio: 180 / 175,
    alignSelf: "center",
    marginTop: 24,
  },
  form: { gap: 22, width: '100%', maxWidth: 440, alignSelf: 'center' },
  eye: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  error: { color: theme.colors.error, fontSize: 14 },
  button: {
    backgroundColor: theme.colors.primary,
    minHeight: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "white", fontSize: 20, fontWeight: "600" },
  previewButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  previewText: { color: "#6D941B", fontWeight: "600", fontSize: 14 },
  legal: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  link: { color: "#78A51A", fontWeight: "600" },
});
