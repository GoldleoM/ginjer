import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SignInScreen } from '../features/auth/screens/SignInScreen';
import type { AuthUser } from '../features/auth/types';
import { signOut } from '../features/auth/services/auth';
import { onSessionExpired, restoreSession } from '../services/session';
import { MainNavigator } from './MainNavigator';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [preview, setPreview] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signingOut = useRef(false);
  useEffect(() => {
    let active = true;
    restoreSession().then(session => { if (active) setUser(session); })
      .catch(() => { if (active) setError('Unable to restore your session. Please sign in again.'); })
      .finally(() => { if (active) setRestoring(false); });
    const unsubscribe = onSessionExpired(() => { if (active) { setUser(null); setPreview(false); setError('Your session has expired. Please sign in again.'); } });
    return () => { active = false; unsubscribe(); };
  }, []);
  async function exitSession() {
    if (preview) { setPreview(false); return; }
    if (signingOut.current) return;
    signingOut.current = true; setBusy(true); setError('');
    try { await signOut(); setUser(null); }
    catch { setError('Unable to sign out. Please try again.'); }
    finally { signingOut.current = false; setBusy(false); }
  }
  return <SafeAreaProvider>
    <StatusBar barStyle="dark-content" />
    {restoring ? <View style={styles.starting}><ActivityIndicator color="#8BAE41" accessibilityLabel="Restoring your session" /><Text style={styles.startingText}>Opening Ginjer…</Text></View>
      : user || preview ? <MainNavigator user={user} onExit={exitSession} preview={preview} onUserUpdated={identity => setUser(current => current?._id === identity._id ? { ...current, ...identity } : current)} />
        : registering ? <SignUpScreen onBack={() => setRegistering(false)} />
          : <SignInScreen onSignedIn={setUser} onPreview={() => setPreview(true)} onSignUp={() => setRegistering(true)} />}
    <Modal visible={busy || !!error} transparent animationType="fade" onRequestClose={() => { if (!busy) setError(''); }}>
      <SafeAreaView style={styles.overlay}><View style={styles.feedback}><ScrollView contentContainerStyle={{ gap: 16 }}>
        {busy ? <><ActivityIndicator color="#8BAE41" /><Text>Signing out…</Text></>
          : <><Text accessibilityRole="alert" style={styles.message}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setError('')} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable></>}
      </ScrollView></View></SafeAreaView>
    </Modal>
  </SafeAreaProvider>;
}
const styles = StyleSheet.create({
  starting: { flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', gap: 16 }, startingText: { color: '#858585', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'center', alignItems: 'center', padding: 24 },
  feedback: { width: '100%', maxWidth: 420, maxHeight: '100%', padding: 24, borderRadius: 16, backgroundColor: 'white', gap: 16 },
  message: { color: '#303030', fontSize: 15, lineHeight: 23 }, close: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  closeText: { color: '#6D941B', fontWeight: '600' },
});
