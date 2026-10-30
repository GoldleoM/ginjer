import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthUser } from '../../auth/types';
import { createAccountApi, type AccountIdentity } from '../../auth/services/accountApi';
import { graphql, authenticatedGraphql } from '../../../services/graphql';
import { updateSessionIdentity } from '../../../services/session';
import { InfoDialog } from './WorkspaceUI';

const api = createAccountApi(graphql, authenticatedGraphql);
export function EditAccountDialog({ user, onClose, onSaved }: { user: AuthUser; onClose: () => void; onSaved: (identity: AccountIdentity) => void }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function save() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const identity = await api.update(user._id, firstName, lastName);
      await updateSessionIdentity(identity);
      if (mounted.current) { onSaved(identity); onClose(); }
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Unable to update your profile.'); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  return <InfoDialog visible title="Edit profile" onClose={() => { if (!submitting.current) onClose(); }}><View style={styles.form}>
    <Text style={styles.caption}>{user.emailId}</Text>
    <Text style={styles.label}>First name</Text><TextInput accessibilityLabel="First name" value={firstName} onChangeText={setFirstName} editable={!busy} autoCapitalize="words" maxLength={80} style={styles.input} />
    <Text style={styles.label}>Last name</Text><TextInput accessibilityLabel="Last name" value={lastName} onChangeText={setLastName} editable={!busy} autoCapitalize="words" maxLength={80} style={styles.input} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={save} style={[styles.save, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save changes</Text>}</Pressable>
  </View></InfoDialog>;
}
const styles = StyleSheet.create({ form: { gap: 12 }, caption: { color: '#777777', fontSize: 13, lineHeight: 20 }, label: { color: '#555555', fontSize: 13 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, padding: 12, color: '#303030', fontSize: 15 }, error: { color: '#B42318', fontSize: 14, lineHeight: 22 },
  save: { minHeight: 48, borderRadius: 9, backgroundColor: '#83AF23', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 8 }, saveText: { color: 'white', fontWeight: '600' },
});
