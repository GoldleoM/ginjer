import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SignInScreen } from '../features/auth/screens/SignInScreen';
import type { AuthUser } from '../features/auth/types';
import { signOut } from '../features/auth/services/auth';
import { theme } from '../theme';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    setBusy(true);
    setError('');
    try { await signOut(); setUser(null); }
    catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {user ? (
        <SafeAreaView style={styles.safe}>
          <View style={styles.welcome}>
            <Text style={styles.title}>Welcome, {user.firstName || 'to Ginjer'}!</Text>
            <Text style={styles.body}>You?re signed in. Organisation selection is coming next.</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={logout} style={styles.button}>
              {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign out</Text>}
            </Pressable>
          </View>
        </SafeAreaView>
      ) : <SignInScreen onSignedIn={setUser} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  welcome: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, justifyContent: 'center', gap: 20 },
  title: { fontSize: 28, fontWeight: '600', color: theme.colors.text },
  body: { fontSize: 16, lineHeight: 24, color: theme.colors.muted },
  error: { color: theme.colors.error },
  button: { backgroundColor: theme.colors.primary, borderRadius: 12, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
