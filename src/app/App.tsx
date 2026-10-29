import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SignInScreen } from '../features/auth/screens/SignInScreen';
import type { AuthUser } from '../features/auth/types';
import { signOut } from '../features/auth/services/auth';
import { DeviceNavigator } from '../features/devices/DeviceNavigator';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function exitDevices() {
    if (preview) { setPreview(false); return; }
    if (busy) return;
    setBusy(true);
    setError('');
    try { await signOut(); setUser(null); }
    catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaProvider>
    <StatusBar barStyle="dark-content" />
    {user || preview ? <DeviceNavigator onExit={exitDevices} preview={preview} /> : <SignInScreen onSignedIn={setUser} onPreview={() => setPreview(true)} />}
    <Modal visible={busy || !!error} transparent animationType="fade" onRequestClose={() => { if (!busy) setError(''); }}>
      <View style={styles.overlay}><View style={styles.feedback}>
        {busy ? <><ActivityIndicator color="#83AF23" /><Text>Signing out...</Text></> : <><Text accessibilityRole="alert">{error}</Text><Pressable accessibilityRole="button" onPress={() => setError('')} style={styles.close}><Text>Close</Text></Pressable></>}
      </View></View>
    </Modal>
  </SafeAreaProvider>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'center', alignItems: 'center', padding: 24 },
  feedback: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 16, backgroundColor: 'white', gap: 16 },
  close: { alignSelf: 'flex-end', padding: 12 },
});
