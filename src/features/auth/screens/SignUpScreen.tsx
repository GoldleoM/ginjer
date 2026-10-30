import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { graphql, authenticatedGraphql } from '../../../services/graphql';
import { createAccountApi, type Registration } from '../services/accountApi';

const api = createAccountApi(graphql, authenticatedGraphql);
export function SignUpScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<Registration>({ firstName: '', lastName: '', emailId: '', password: '', confirmation: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');
  const [visible, setVisible] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (!submitting.current) onBack(); return true; }); return () => sub.remove(); }, [onBack]);
  async function submit() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await api.register(form);
      if (mounted.current) { setCreated(result.email); setForm(value => ({ ...value, password: '', confirmation: '' })); }
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Unable to create your account.'); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={22} color="#6D941B" /><Text style={styles.link}>Back to sign in</Text></Pressable>
      <Text accessibilityRole="header" style={styles.title}>{created ? 'Account created' : 'Create your Ginjer account'}</Text>
      {created ? <><Text style={styles.description}>Your account for {created} was created. Check your email for any verification instructions, then sign in.</Text><Text style={styles.description}>To access an existing organization, ask its administrator to invite this email address.</Text><Pressable accessibilityRole="button" onPress={onBack} style={styles.submit}><Text style={styles.submitText}>Sign in</Text></Pressable></> : <>
        <Text style={styles.description}>Create an account to get started. Organization access is provided by your administrator.</Text>
        {([['firstName', 'First name'], ['lastName', 'Last name'], ['emailId', 'Email address'], ['password', 'Password'], ['confirmation', 'Confirm password']] as const).map(([key, label]) => <View key={key} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={text => setForm(value => ({ ...value, [key]: text }))} editable={!busy} style={styles.input} autoCapitalize={key === 'firstName' || key === 'lastName' ? 'words' : 'none'} autoCorrect={false} keyboardType={key === 'emailId' ? 'email-address' : 'default'} secureTextEntry={!visible && (key === 'password' || key === 'confirmation')} autoComplete={key === 'emailId' ? 'email' : key === 'password' ? 'new-password' : 'off'} /></View>)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: visible }} onPress={() => setVisible(value => !value)} style={styles.back}><MaterialCommunityIcons name={visible ? 'checkbox-marked-outline' : 'checkbox-blank-outline'} size={22} color="#6D941B" /><Text style={styles.link}>Show passwords</Text></Pressable>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={submit} style={[styles.submit, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Create account</Text>}</Pressable>
      </>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F8F8F8' }, content: { padding: 24, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1, paddingBottom: 40 },
  back: { minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center' }, link: { color: '#6D941B', fontSize: 14 }, title: { fontSize: 26, lineHeight: 35, color: '#303030', fontWeight: '600' }, description: { color: '#777777', fontSize: 14, lineHeight: 22 },
  field: { gap: 7 }, label: { color: '#555555', fontSize: 13 }, input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, minHeight: 50, padding: 12, color: '#303030', fontSize: 15 },
  submit: { minHeight: 52, backgroundColor: '#8BAE41', borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' }, submitText: { color: 'white', fontSize: 16, fontWeight: '600' }, error: { color: '#B42318', fontSize: 14, lineHeight: 22 },
});
