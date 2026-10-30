import React, { useEffect, useRef, useState } from 'react';
import { responsiveStyles, ResponsiveGrid } from '../../../layout/responsive';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileAvatar, ProfileField, profileColors, profileStyles } from '../components/ProfileUI';
import { SelectionSheet } from '../components/SelectionSheet';
import { normalizeProfile, validateProfile } from '../services/validation';
import type { Organization, Profile, ProfileErrors } from '../types';

export function EditProfileScreen({ profile, organizations, onSave, onBack }: {
  profile: Profile; organizations: Organization[]; onSave: (profile: Profile) => Promise<void>; onBack: () => void;
}) {
  const [draft, setDraft] = useState<Profile>({ ...profile });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [sheet, setSheet] = useState<'organization' | 'avatar' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const primaryRef = useRef<TextInput>(null);
  const secondaryRef = useRef<TextInput>(null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving.current) onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  function change(field: keyof ProfileErrors, value: string) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (submitted) setErrors(validateProfile(next));
    setError('');
  }
  async function save() {
    if (saving.current) return;
    const next = normalizeProfile(draft);
    const validation = validateProfile(next);
    setSubmitted(true);
    setErrors(validation);
    const firstError = (['firstName', 'lastName', 'email', 'primaryPhone', 'secondaryPhone'] as const).find(field => validation[field]);
    if (firstError) {
      ({ firstName: firstNameRef, lastName: lastNameRef, email: emailRef, primaryPhone: primaryRef, secondaryPhone: secondaryRef })[firstError].current?.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try { await onSave(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your profile. Please try again.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <SafeAreaView style={[profileStyles.safe, styles.white]} edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={profileStyles.shell} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={profileStyles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to profile, discard unsaved changes" disabled={busy} onPress={onBack} style={profileStyles.iconButton}><MaterialCommunityIcons name="arrow-left" size={23} color={profileColors.text} /></Pressable>
        <Text accessibilityRole="header" style={profileStyles.title}>Edit Profile</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={save} style={profileStyles.iconButton}>
          {busy ? <ActivityIndicator color={profileColors.green} /> : <MaterialCommunityIcons name="check" size={24} color={profileColors.text} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, responsiveStyles.readable]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.avatar}><ProfileAvatar firstName={draft.firstName} lastName={draft.lastName} variant={draft.avatarStyle} onEdit={busy ? undefined : () => setSheet('avatar')} /></View>
        <ResponsiveGrid minimumWidth={280} gap={23} maximumColumns={2}>
          <ProfileField inputRef={firstNameRef} label="First Name" icon="account-outline" value={draft.firstName} onChangeText={value => change('firstName', value)}
            error={errors.firstName} editable={!busy} autoComplete="given-name" textContentType="givenName" autoCapitalize="words" returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()} />
          <ProfileField inputRef={lastNameRef} label="Last Name" icon="account-outline" value={draft.lastName} onChangeText={value => change('lastName', value)}
            error={errors.lastName} editable={!busy} autoComplete="family-name" textContentType="familyName" autoCapitalize="words" returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()} />
          <ProfileField inputRef={emailRef} label="Email" icon="email-outline" value={draft.email} onChangeText={value => change('email', value)}
            error={errors.email} editable={!busy} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} returnKeyType="next"
            onSubmitEditing={() => primaryRef.current?.focus()} />
          <ProfileField inputRef={primaryRef} label="Primary Phone Number" icon="cellphone" value={draft.primaryPhone} onChangeText={value => change('primaryPhone', value)}
            error={errors.primaryPhone} editable={!busy} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" returnKeyType="next"
            onSubmitEditing={() => secondaryRef.current?.focus()} />
          <ProfileField inputRef={secondaryRef} label="Secondary Phone Number" icon="cellphone" value={draft.secondaryPhone} onChangeText={value => change('secondaryPhone', value)}
            error={errors.secondaryPhone} accessibilityHint="Optional" editable={!busy} keyboardType="phone-pad" returnKeyType="done" onSubmitEditing={save} />
          <Pressable accessibilityRole="button" accessibilityLabel="Organization" accessibilityValue={{ text: organizations.find(item => item.id === draft.organizationId)?.name }}
            accessibilityHint="Choose an organization" disabled={busy} onPress={() => setSheet('organization')} style={styles.organization}>
            <Text style={styles.organizationLabel}>Organization</Text>
            <MaterialCommunityIcons name="office-building-outline" size={21} color={profileColors.text} />
            <Text style={styles.organizationName}>{organizations.find(item => item.id === draft.organizationId)?.name}</Text>
            <MaterialCommunityIcons name="chevron-down" size={21} color={profileColors.muted} />
          </Pressable>
        </ResponsiveGrid>
        {!!error && <Text accessibilityRole="alert" style={profileStyles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
    <SelectionSheet visible={sheet === 'organization'} title="Organization" items={organizations} selectedId={draft.organizationId} icon="office-building-outline"
      onClose={() => setSheet(null)} onSelect={id => { setDraft(value => ({ ...value, organizationId: id, projectId: id === value.organizationId ? value.projectId : null })); setSheet(null); }} />
    <SelectionSheet visible={sheet === 'avatar'} title="Avatar" icon="account-outline"
      items={[{ id: 'default', name: 'Default avatar' }, { id: 'initials', name: 'Use my initials' }]} selectedId={draft.avatarStyle} onClose={() => setSheet(null)}
      onSelect={id => { if (id === 'default' || id === 'initials') setDraft(value => ({ ...value, avatarStyle: id })); setSheet(null); }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  white: { backgroundColor: 'white' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  avatar: { alignItems: 'center', marginTop: 20, marginBottom: 38 },
  organization: { minHeight: 58, borderWidth: 1, borderColor: '#9B98A5', borderRadius: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  organizationLabel: { position: 'absolute', left: 12, top: -9, paddingHorizontal: 4, fontSize: 11, backgroundColor: 'white', color: profileColors.green },
  organizationName: { flex: 1, fontSize: 15, color: profileColors.text, paddingVertical: 17 },
});
