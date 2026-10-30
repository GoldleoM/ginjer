import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileColors, profileStyles } from './components/ProfileUI';
import { SelectionSheet } from './components/SelectionSheet';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import type { Organization, Profile, ProfileRepository, Project } from './types';

export function ProfileNavigator({ repository, onDevices, onAnalytics, onLogout }: {
  repository: ProfileRepository; onDevices: () => void; onAnalytics: () => void; onLogout: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<'organizations' | 'projects' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const selecting = useRef(false);

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([repository.load(), repository.listOrganizations(), repository.listProjects()])
      .then(([value, orgs, availableProjects]) => { if (active) { setProfile(value); setOrganizations(orgs); setProjects(availableProjects); } })
      .catch(() => { if (active) setError('Unable to load your profile. Please try again.'); });
    return () => { active = false; };
  }, [repository, retry]);

  useEffect(() => {
    if (editing) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selecting.current) onDevices();
      return true;
    });
    return () => subscription.remove();
  }, [editing, onDevices]);

  const closeEdit = useCallback(() => setEditing(false), []);
  if (!profile) return <SafeAreaView style={profileStyles.safe}><View style={[profileStyles.shell, styles.loading]}>
    {error ? <><Text accessibilityRole="alert" style={profileStyles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.action}><Text>Try again</Text></Pressable></> : <ActivityIndicator accessibilityLabel="Loading profile" color={profileColors.green} />}
    <Pressable accessibilityRole="button" onPress={onDevices} style={styles.action}><Text>Back to devices</Text></Pressable>
  </View></SafeAreaView>;

  async function saveEdit(value: Profile) {
    const saved = await repository.save(value);
    setProfile(saved);
    setNotice('Profile updated.');
    setEditing(false);
  }
  async function select(id: string) {
    if (!profile || selecting.current) return;
    selecting.current = true;
    setSaving(true);
    setSheet(null);
    setError('');
    try {
      const next = sheet === 'organizations'
        ? { ...profile, organizationId: id, projectId: id === profile.organizationId ? profile.projectId : null }
        : { ...profile, projectId: id };
      setProfile(await repository.save(next));
      setNotice(sheet === 'organizations' ? 'Organization updated.' : 'Project updated.');
    } catch { setError('Unable to update your selection. Please try again.'); }
    finally { selecting.current = false; setSaving(false); }
  }

  if (editing) return <EditProfileScreen profile={profile} organizations={organizations} onSave={saveEdit} onBack={closeEdit} />;
  return <View style={{ flex: 1 }}>
    <ProfileScreen profile={profile} organizationName={organizations.find(item => item.id === profile.organizationId)?.name ?? ''}
      projectName={projects.find(item => item.id === profile.projectId)?.name} notice={notice}
      onEdit={() => { setNotice(''); setError(''); setEditing(true); }} onOrganizations={() => setSheet('organizations')} onProjects={() => setSheet('projects')}
      onLogout={onLogout} onDevices={onDevices} onAnalytics={onAnalytics} />
    {!!error && <View style={styles.error}><Text accessibilityRole="alert" style={profileStyles.error}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={() => setError('')} style={styles.action}><Text>Dismiss</Text></Pressable></View>}
    <SelectionSheet visible={sheet !== null} title={sheet === 'projects' ? 'Project' : 'Organization'}
      items={sheet === 'projects' ? projects.filter(item => item.organizationId === profile.organizationId) : organizations}
      selectedId={sheet === 'projects' ? profile.projectId : profile.organizationId}
      icon={sheet === 'projects' ? 'view-dashboard-outline' : 'office-building-outline'} onClose={() => setSheet(null)} onSelect={select} />
    {saving && <View style={styles.saving}><ActivityIndicator accessibilityLabel="Saving selection" color={profileColors.green} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  action: { padding: 16, minHeight: 44 },
  saving: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF88', alignItems: 'center', justifyContent: 'center' },
  error: { position: 'absolute', bottom: 80, alignSelf: 'center', maxWidth: 500, backgroundColor: 'white', borderRadius: 8, marginHorizontal: 16, elevation: 6 },
});
